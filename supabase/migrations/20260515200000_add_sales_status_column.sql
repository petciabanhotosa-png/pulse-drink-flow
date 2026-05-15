-- Adicionar coluna status na tabela sales se não existir
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pago'
  CHECK (status IN ('pago', 'pendente'));

-- Adicionar coluna paid_at na tabela sales para rastrear quando venda pendente foi paga
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Adicionar coluna supplier na tabela purchases
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS supplier TEXT;

-- Adicionar restrições de preço positivo nos produtos
ALTER TABLE public.products ADD CONSTRAINT products_cost_price_positive CHECK (cost_price >= 0);
ALTER TABLE public.products ADD CONSTRAINT products_sale_price_positive CHECK (sale_price >= 0);
ALTER TABLE public.products ADD CONSTRAINT products_min_stock_positive CHECK (min_stock >= 0);

-- Adicionar restrições de quantidade positiva nos lotes
ALTER TABLE public.purchase_batches ADD CONSTRAINT batches_initial_qty_positive CHECK (initial_quantity > 0);
ALTER TABLE public.purchase_batches ADD CONSTRAINT batches_remaining_qty_nonneg CHECK (remaining_quantity >= 0);
ALTER TABLE public.purchase_batches ADD CONSTRAINT batches_purchase_price_positive CHECK (purchase_price >= 0);
