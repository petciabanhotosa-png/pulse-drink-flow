DROP TRIGGER IF EXISTS trg_sync_stock_on_batch_insert ON public.purchase_batches;
DROP TRIGGER IF EXISTS trg_sync_stock_on_batch_update ON public.purchase_batches;
DROP TRIGGER IF EXISTS trg_sync_stock_on_batch_delete ON public.purchase_batches;

DROP TRIGGER IF EXISTS trg_sync_product_stock_from_batches ON public.purchase_batches;

CREATE TRIGGER trg_sync_product_stock_from_batches
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_batches
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_stock_from_batches();