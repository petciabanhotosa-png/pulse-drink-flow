CREATE OR REPLACE FUNCTION public.sync_product_stock_from_batches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  affected_product_id uuid;
  total_stock integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_product_id := OLD.product_id;
  ELSE
    affected_product_id := NEW.product_id;
  END IF;

  SELECT COALESCE(SUM(remaining_quantity), 0)
    INTO total_stock
    FROM public.purchase_batches
   WHERE product_id = affected_product_id;

  UPDATE public.products
     SET stock_quantity = total_stock,
         updated_at = now()
   WHERE id = affected_product_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_product_stock_after_batch_insert ON public.purchase_batches;
DROP TRIGGER IF EXISTS sync_product_stock_after_batch_update ON public.purchase_batches;
DROP TRIGGER IF EXISTS sync_product_stock_after_batch_delete ON public.purchase_batches;

CREATE TRIGGER sync_product_stock_after_batch_insert
AFTER INSERT ON public.purchase_batches
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_stock_from_batches();

CREATE TRIGGER sync_product_stock_after_batch_update
AFTER UPDATE OF remaining_quantity, initial_quantity, product_id ON public.purchase_batches
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_stock_from_batches();

CREATE TRIGGER sync_product_stock_after_batch_delete
AFTER DELETE ON public.purchase_batches
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_stock_from_batches();