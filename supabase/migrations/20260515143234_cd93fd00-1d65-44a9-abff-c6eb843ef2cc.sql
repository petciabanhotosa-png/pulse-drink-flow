CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public select for app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Public insert for app_settings" ON public.app_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for app_settings" ON public.app_settings FOR UPDATE USING (true);
CREATE POLICY "Public delete for app_settings" ON public.app_settings FOR DELETE USING (true);

CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();