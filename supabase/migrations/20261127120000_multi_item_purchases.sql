-- One atomic request for all purchase lines. Existing records/RPCs stay intact.
-- Keep the existing per-product purchase/batch/cash links and backup format.
CREATE FUNCTION public.create_purchase_order(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  item jsonb; pid uuid; qty integer; price numeric; product_name text;
  purchase public.purchases; batch public.purchase_batches; stock integer;
  payment text := p_payload->>'payment_method';
  supplier text := nullif(trim(p_payload->>'supplier'),'');
  total numeric := 0; purchases_json jsonb := '[]'; installments jsonb := '[]';
  names text := ''; first_purchase_id uuid; first_due date; count_items integer;
BEGIN
  IF NOT public.is_app_member() THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
  PERFORM pg_advisory_xact_lock(714302916);
  IF payment IS NULL OR payment NOT IN ('dinheiro','pix','debito','credito') THEN
    RAISE EXCEPTION 'Forma de pagamento inválida';
  END IF;
  IF jsonb_typeof(p_payload->'items') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Informe os itens da compra';
  END IF;
  count_items := jsonb_array_length(p_payload->'items');
  IF count_items<1 OR count_items>100 THEN RAISE EXCEPTION 'Informe de 1 a 100 itens'; END IF;
  IF payment='credito' THEN
    first_due := (p_payload->>'first_due_date')::date;
    IF first_due IS NULL OR NOT isfinite(first_due) OR first_due <= (now() AT TIME ZONE 'America/Manaus')::date THEN
      RAISE EXCEPTION 'O primeiro vencimento deve ser uma data futura';
    END IF;
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_payload->'items') LOOP
    pid := (item->>'product_id')::uuid;
    IF (item->>'quantity')::numeric <> trunc((item->>'quantity')::numeric) THEN
      RAISE EXCEPTION 'Quantidade deve ser inteira';
    END IF;
    qty := (item->>'quantity')::integer;
    price := round((item->>'unit_cost')::numeric,2);
    IF qty IS NULL OR qty<=0 OR price IS NULL OR price<=0 OR price::text IN ('NaN','Infinity','-Infinity') THEN
      RAISE EXCEPTION 'Quantidade ou custo inválido';
    END IF;
    SELECT p.name INTO product_name FROM public.products p WHERE p.id=pid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
    INSERT INTO public.purchases(product_id,quantity,unit_cost,total_amount,payment_method,supplier)
      VALUES(pid,qty,price,qty*price,payment,supplier) RETURNING * INTO purchase;
    IF first_purchase_id IS NULL THEN first_purchase_id:=purchase.id; END IF;
    INSERT INTO public.purchase_batches(product_id,initial_quantity,remaining_quantity,purchase_price,purchase_id,supplier)
      VALUES(pid,qty,qty,price,purchase.id,supplier) RETURNING * INTO batch;
    SELECT stock_quantity INTO stock FROM public.products WHERE id=pid;
    INSERT INTO public.inventory_movements(product_id,batch_id,movement_type,quantity,unit_price,origin,reference_id,resulting_stock)
      VALUES(pid,batch.id,'entrada',qty,price,'compra',purchase.id,stock);
    IF payment<>'credito' THEN
      INSERT INTO public.cash_flow(type,category,description,amount,reference_id,reference_type)
        VALUES('saida','compra','Compra de '||product_name,purchase.total_amount,purchase.id,'purchase');
    END IF;
    total:=total+purchase.total_amount;
    purchases_json:=purchases_json||to_jsonb(purchase);
    names:=names||CASE WHEN names='' THEN '' ELSE ', ' END||product_name;
  END LOOP;
  IF payment='credito' THEN
    -- One plan over the combined total, never a plan repeated for each product.
    -- Multiple products have no single purchase_id; preserve every stock line.
    installments:=public.insert_bill_installments(
      'Compra de '||names||CASE WHEN supplier IS NULL THEN '' ELSE ' · '||supplier END,
      total,(p_payload->>'installment_count')::integer,first_due,
      CASE WHEN count_items=1 THEN first_purchase_id ELSE NULL END);
  END IF;
  RETURN jsonb_build_object('purchases',purchases_json,'total_amount',total,'installments',installments);
END;
$$;
REVOKE ALL ON FUNCTION public.create_purchase_order(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_purchase_order(jsonb) TO authenticated;
