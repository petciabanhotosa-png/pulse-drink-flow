
-- Create purchase_batches table for FIFO inventory management
CREATE TABLE public.purchase_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  initial_quantity INTEGER NOT NULL,
  remaining_quantity INTEGER NOT NULL,
  purchase_price NUMERIC NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  supplier TEXT,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory_movements table
CREATE TABLE public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.purchase_batches(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL, -- 'entrada', 'venda', 'ajuste', 'perda'
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  origin TEXT NOT NULL, -- 'compra', 'venda', 'ajuste'
  reference_id UUID,
  movement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resulting_stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchase_batches
CREATE POLICY "Public select for purchase_batches" ON public.purchase_batches FOR SELECT TO public USING (true);
CREATE POLICY "Public insert for purchase_batches" ON public.purchase_batches FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update for purchase_batches" ON public.purchase_batches FOR UPDATE TO public USING (true);
CREATE POLICY "Public delete for purchase_batches" ON public.purchase_batches FOR DELETE TO public USING (true);

-- RLS policies for inventory_movements (read-only from app perspective, but insert allowed)
CREATE POLICY "Public select for inventory_movements" ON public.inventory_movements FOR SELECT TO public USING (true);
CREATE POLICY "Public insert for inventory_movements" ON public.inventory_movements FOR INSERT TO public WITH CHECK (true);

-- Index for FIFO queries (oldest batches with remaining stock)
CREATE INDEX idx_purchase_batches_fifo ON public.purchase_batches (product_id, created_at ASC) WHERE remaining_quantity > 0;
CREATE INDEX idx_inventory_movements_product ON public.inventory_movements (product_id, movement_date DESC);
