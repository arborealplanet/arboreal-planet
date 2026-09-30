-- Public site settings / feature flags (e.g. seasonal shop themes).
-- Values are public; only the owner may write them.

CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Public read: these are feature flags, safe for everyone.
CREATE POLICY site_settings_public_select ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- Writes are owner-only (role checked against public.profiles).
CREATE POLICY site_settings_owner_insert ON public.site_settings
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner');

CREATE POLICY site_settings_owner_update ON public.site_settings
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner');

CREATE POLICY site_settings_owner_delete ON public.site_settings
  FOR DELETE TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner');
