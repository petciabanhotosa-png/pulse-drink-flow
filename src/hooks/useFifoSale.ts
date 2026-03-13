import { supabase } from "@/integrations/supabase/client";
import { SaleItemInput } from "@/types/database";

/**
 * Consume stock from oldest batches first (FIFO/PEPS).
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

    // Update batch remaining quantity
    const { error: updateError } = await supabase
      .from("purchase_batches")
      .update({ remaining_quantity: batch.remaining_quantity - consume })
      .eq("id", batch.id);

    if (updateError) throw updateError;

    consumptions.push({ batchId: batch.id, qty: consume, price: batch.purchase_price });
    remaining -= consume;
  }

  if (remaining > 0) {
    // Not enough batches — use product cost_price as fallback for unbatched stock
    const { data: product } = await supabase
      .from("products")
      .select("cost_price")
      .eq("id", productId)
      .single();
    
    totalCost += remaining * (product?.cost_price || 0);
    consumptions.push({ batchId: "", qty: remaining, price: product?.cost_price || 0 });
  }

  // Get current stock for resulting_stock calculation
  const { data: product } = await supabase
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .single();

  const newStock = (product?.stock_quantity || 0) - quantityNeeded;

  // Update product stock
  await supabase
    .from("products")
    .update({ stock_quantity: Math.max(0, newStock) })
    .eq("id", productId);

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
        resulting_stock: Math.max(0, newStock),
      });
    }
  }

  return { totalCost, batchConsumptions: consumptions };
}
