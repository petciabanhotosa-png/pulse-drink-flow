import { supabase } from "@/integrations/supabase/client";

/**
 * Consume stock from oldest batches first (FIFO/PEPS).
 * The product.stock_quantity is auto-synced by a database trigger
 * when batches.remaining_quantity changes.
 * Returns the weighted average cost for profit calculation.
 */
export async function consumeBatchesFIFO(
  productId: string,
  quantityNeeded: number,
  saleId: string
): Promise<{ totalCost: number; batchConsumptions: { batchId: string; qty: number; price: number }[] }> {
  // Get batches with remaining stock, ordered by oldest first
  const { data: batches, error } = await supabase
    .from("purchase_batches")
    .select("*")
    .eq("product_id", productId)
    .gt("remaining_quantity", 0)
    .order("created_at", { ascending: true });

  if (error) throw error;

  let remaining = quantityNeeded;
  let totalCost = 0;
  const consumptions: { batchId: string; qty: number; price: number }[] = [];

  for (const batch of batches || []) {
    if (remaining <= 0) break;

    const consume = Math.min(remaining, batch.remaining_quantity);
    totalCost += consume * batch.purchase_price;

    // Update batch remaining quantity (trigger will sync product stock)
    const { error: updateError } = await supabase
      .from("purchase_batches")
      .update({ remaining_quantity: batch.remaining_quantity - consume })
      .eq("id", batch.id);

    if (updateError) throw updateError;

    consumptions.push({ batchId: batch.id, qty: consume, price: batch.purchase_price });
    remaining -= consume;
  }

  if (remaining > 0) {
    throw new Error("Estoque insuficiente nos lotes deste produto");
  }

  // Read the up-to-date stock (already synced by trigger) for movement log
  const { data: product } = await supabase
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .single();

  const newStock = product?.stock_quantity ?? 0;

  // Record inventory movements for each batch consumed
  for (const c of consumptions) {
    if (c.qty > 0) {
      const { error: mvError } = await supabase.from("inventory_movements").insert({
        product_id: productId,
        batch_id: c.batchId || null,
        movement_type: "venda",
        quantity: c.qty,
        unit_price: c.price,
        origin: "venda",
        reference_id: saleId,
        resulting_stock: newStock,
      });
      if (mvError) console.error("Erro ao registrar movimentação de estoque:", mvError);
    }
  }

  return { totalCost, batchConsumptions: consumptions };
}

/**
 * Restore stock to batches when a pending sale is edited or deleted.
 * Returns quantities to the most recent batches consumed (LIFO of restoration).
 * Uses inventory_movements log to know which batches were used.
 */
export async function restoreBatchesFromSale(saleId: string): Promise<void> {
  const { data: currentItems, error: itemsError } = await supabase
    .from("sale_items")
    .select("product_id, quantity")
    .eq("sale_id", saleId);

  if (itemsError) throw itemsError;
  if (!currentItems || currentItems.length === 0) return;

  const remainingByProduct = new Map<string, number>();
  for (const item of currentItems) {
    remainingByProduct.set(
      item.product_id,
      (remainingByProduct.get(item.product_id) || 0) + item.quantity
    );
  }

  // Restore only the latest active consumption represented by current sale_items.
  const { data: movements, error } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("reference_id", saleId)
    .eq("movement_type", "venda")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!movements || movements.length === 0) return;

  // Restore each batch
  for (const mv of movements) {
    const remainingForProduct = remainingByProduct.get(mv.product_id) || 0;
    if (remainingForProduct <= 0) continue;

    const qtyToRestore = Math.min(remainingForProduct, mv.quantity);
    if (mv.batch_id) {
      const { data: batch, error: batchFetchError } = await supabase
        .from("purchase_batches")
        .select("remaining_quantity, initial_quantity")
        .eq("id", mv.batch_id)
        .single();

      if (batchFetchError) console.error("Erro ao buscar lote para restauração:", batchFetchError);

      if (batch) {
        const restored = Math.min(
          batch.remaining_quantity + qtyToRestore,
          batch.initial_quantity
        );
        const { error: restoreError } = await supabase
          .from("purchase_batches")
          .update({ remaining_quantity: restored })
          .eq("id", mv.batch_id);
        if (restoreError) console.error("Erro ao restaurar lote:", restoreError);
      }
    }
    remainingByProduct.set(mv.product_id, remainingForProduct - qtyToRestore);
  }

  // Insert one reversal per movement to keep audit symmetrical
  for (const mv of movements) {
    const { data: prod } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", mv.product_id)
      .single();

    const { error: reversalError } = await supabase.from("inventory_movements").insert({
      product_id: mv.product_id,
      batch_id: mv.batch_id,
      movement_type: "ajuste",
      quantity: Math.min(mv.quantity, (currentItems || [])
        .filter((item) => item.product_id === mv.product_id)
        .reduce((sum, item) => sum + item.quantity, 0)),
      unit_price: mv.unit_price,
      origin: "ajuste",
      reference_id: saleId,
      resulting_stock: prod?.stock_quantity ?? 0,
    });
    if (reversalError) console.error("Erro ao registrar movimentação de ajuste:", reversalError);
  }
}
