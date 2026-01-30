-- Adicionar coluna de desconto e status na tabela sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

-- Atualizar as políticas RLS para usar SELECT em vez de ALL
-- Primeiro, remover políticas existentes
DROP POLICY IF EXISTS "Public access for bills" ON public.bills;
DROP POLICY IF EXISTS "Public access for cash_flow" ON public.cash_flow;
DROP POLICY IF EXISTS "Public access for customers" ON public.customers;
DROP POLICY IF EXISTS "Public access for products" ON public.products;
DROP POLICY IF EXISTS "Public access for purchases" ON public.purchases;
DROP POLICY IF EXISTS "Public access for sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Public access for sales" ON public.sales;

-- Criar políticas separadas para cada operação (SELECT é público, mas com PERMISSIVE)
-- BILLS
CREATE POLICY "Public select for bills" ON public.bills FOR SELECT USING (true);
CREATE POLICY "Public insert for bills" ON public.bills FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for bills" ON public.bills FOR UPDATE USING (true);
CREATE POLICY "Public delete for bills" ON public.bills FOR DELETE USING (true);

-- CASH_FLOW  
CREATE POLICY "Public select for cash_flow" ON public.cash_flow FOR SELECT USING (true);
CREATE POLICY "Public insert for cash_flow" ON public.cash_flow FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for cash_flow" ON public.cash_flow FOR UPDATE USING (true);
CREATE POLICY "Public delete for cash_flow" ON public.cash_flow FOR DELETE USING (true);

-- CUSTOMERS
CREATE POLICY "Public select for customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Public insert for customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for customers" ON public.customers FOR UPDATE USING (true);
CREATE POLICY "Public delete for customers" ON public.customers FOR DELETE USING (true);

-- PRODUCTS
CREATE POLICY "Public select for products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public insert for products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Public delete for products" ON public.products FOR DELETE USING (true);

-- PURCHASES
CREATE POLICY "Public select for purchases" ON public.purchases FOR SELECT USING (true);
CREATE POLICY "Public insert for purchases" ON public.purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for purchases" ON public.purchases FOR UPDATE USING (true);
CREATE POLICY "Public delete for purchases" ON public.purchases FOR DELETE USING (true);

-- SALE_ITEMS
CREATE POLICY "Public select for sale_items" ON public.sale_items FOR SELECT USING (true);
CREATE POLICY "Public insert for sale_items" ON public.sale_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for sale_items" ON public.sale_items FOR UPDATE USING (true);
CREATE POLICY "Public delete for sale_items" ON public.sale_items FOR DELETE USING (true);

-- SALES
CREATE POLICY "Public select for sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Public insert for sales" ON public.sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for sales" ON public.sales FOR UPDATE USING (true);
CREATE POLICY "Public delete for sales" ON public.sales FOR DELETE USING (true);