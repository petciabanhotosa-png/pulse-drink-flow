CREATE OR REPLACE FUNCTION public.fifo_consume_batches(
  p_product_id UUID,
  p_quantity INTEGER,
  p_sale_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_remaining INTEGER := p_quantity;
  v_total_cost NUMERIC := 0;
  v_result JSONB;
  v_batch RECORD;
  v_new_stock INTEGER;
  v_consumptions JSONB := '[]'::JSONB;
BEGIN
  PERFORM 1 FROM public.purchase_batches
  WHERE product_id = p_product_id AND remaining_quantity > 0
  ORDER BY created_at ASC
  FOR UPDATE;

  FOR v_batch IN
    SELECT id, remaining_quantity, purchase_price
    FROM public.purchase_batches
    WHERE product_id = p_product_id AND remaining_quantity > 0
    ORDER BY created_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;
    DECLARE
      v_consume INTEGER;
    BEGIN
      v_consume := LEAST(v_remaining, v_batch.remaining_quantity);
      v_total_cost := v_total_cost + (v_consume * v_batch.purchase_price);

      UPDATE public.purchase_batches
      SET remaining_quantity = remaining_quantity - v_consume
      WHERE id = v_batch.id;

      v_consumptions := v_consumptions || jsonb_build_object(
        'batchId', v_batch.id,
        'qty', v_consume,
        'price', v_batch.purchase_price
      );

      v_remaining := v_remaining - v_consume;
    END;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente nos lotes deste produto';
  END IF;

  SELECT COALESCE(SUM(remaining_quantity), 0)
  INTO v_new_stock
  FROM public.purchase_batches
  WHERE product_id = p_product_id;

  WITH consumptions_data AS (
    SELECT
      (item->>'batchId')::UUID AS batch_id,
      (item->>'qty')::INTEGER AS qty,
      (item->>'price')::NUMERIC AS price
    FROM jsonb_array_elements(v_consumptions) AS item
  )
  INSERT INTO public.inventory_movements (
    product_id, batch_id, movement_type, quantity,
    unit_price, origin, reference_id, resulting_stock
  )
  SELECT
    p_product_id,
    batch_id,
    'venda',
    qty,
    price,
    'venda',
    p_sale_id,
    v_new_stock
  FROM consumptions_data
  WHERE qty > 0;

  v_result := jsonb_build_object(
    'totalCost', v_total_cost,
    'batchConsumptions', v_consumptions
  );

  RETURN v_result;
END;
$$;