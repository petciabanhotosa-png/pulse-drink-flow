DROP TRIGGER IF EXISTS trg_sync_product_stock_from_batches ON public.purchase_batches;

CREATE TRIGGER trg_sync_product_stock_from_batches
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_batches
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_stock_from_batches();