-- Function to sync product stock from batches
CREATE OR REPLACE FUNCTION public.sync_product_stock_from_batches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
  total_stock integer;
BEGIN
  -- Determine which product_id to update
  IF TG_OP = 'DELETE' THEN
    pid := OLD.product_id;
  ELSE
    pid := NEW.product_id;
  END IF;

  -- Calculate total remaining from all batches for this product
  SELECT COALESCE(SUM(remaining_quantity), 0)
    INTO total_stock
    FROM public.purchase_batches
   WHERE product_id = pid;

  -- Update product stock_quantity to match
  UPDATE public.products
     SET stock_quantity = total_stock,
         updated_at = now()
   WHERE id = pid;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS trg_sync_stock_on_batch_insert ON public.purchase_batches;
DROP TRIGGER IF EXISTS trg_sync_stock_on_batch_update ON public.purchase_batches;
DROP TRIGGER IF EXISTS trg_sync_stock_on_batch_delete ON public.purchase_batches;

-- Create triggers on purchase_batches
CREATE TRIGGER trg_sync_stock_on_batch_insert
AFTER INSERT ON public.purchase_batches
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_stock_from_batches();

CREATE TRIGGER trg_sync_stock_on_batch_update
AFTER UPDATE OF remaining_quantity ON public.purchase_batches
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_stock_from_batches();

CREATE TRIGGER trg_sync_stock_on_batch_delete
AFTER DELETE ON public.purchase_batches
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_stock_from_batches();

-- One-time fix: sync all existing products to their current batch totals
UPDATE public.products p
   SET stock_quantity = COALESCE((
       SELECT SUM(remaining_quantity)
         FROM public.purchase_batches
        WHERE product_id = p.id
   ), 0),
   updated_at = now();
