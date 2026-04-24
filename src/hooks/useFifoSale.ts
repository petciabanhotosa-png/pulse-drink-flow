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
    // Not enough batches — fallback to product cost_price
    const { data: product } = await supabase
      .from("products")
      .select("cost_price")
      .eq("id", productId)
      .single();
    
    totalCost += remaining * (product?.cost_price || 0);
    consumptions.push({ batchId: "", qty: remaining, price: product?.cost_price || 0 });
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
      await supabase.from("inventory_movements").insert({
        product_id: productId,
        batch_id: c.batchId || null,
        movement_type: "venda",
        quantity: c.qty,
        unit_price: c.price,
        origin: "venda",
        reference_id: saleId,
        resulting_stock: newStock,
      });
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
  // Find all "venda" movements for this sale
  const { data: movements, error } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("reference_id", saleId)
    .eq("movement_type", "venda");

  if (error) throw error;
  if (!movements || movements.length === 0) return;

  // Restore each batch
  for (const mv of movements) {
    if (mv.batch_id) {
      const { data: batch } = await supabase
        .from("purchase_batches")
        .select("remaining_quantity, initial_quantity")
        .eq("id", mv.batch_id)
        .single();
      
      if (batch) {
        const restored = Math.min(
          batch.remaining_quantity + mv.quantity,
          batch.initial_quantity
        );
        await supabase
          .from("purchase_batches")
          .update({ remaining_quantity: restored })
          .eq("id", mv.batch_id);
      }
    }
  }

  // Record reversal movement (audit trail) — use "ajuste" for compensation entry
  const { data: product } = await supabase
    .from("products")
    .select("stock_quantity, id")
    .eq("id", movements[0].product_id)
    .single();

  // Insert one reversal per movement to keep audit symmetrical
  for (const mv of movements) {
    const { data: prod } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", mv.product_id)
      .single();

    await supabase.from("inventory_movements").insert({
      product_id: mv.product_id,
      batch_id: mv.batch_id,
      movement_type: "ajuste",
      quantity: mv.quantity,
      unit_price: mv.unit_price,
      origin: "ajuste",
      reference_id: saleId,
      resulting_stock: prod?.stock_quantity ?? 0,
    });
  }
}
