
DO $$
DECLARE
  t TEXT;
  p RECORD;
BEGIN
  FOR t IN SELECT unnest(ARRAY['products','customers','sales','sale_items','purchases','purchase_batches','inventory_movements','bills','cash_flow','app_settings'])
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY "Public access for %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
