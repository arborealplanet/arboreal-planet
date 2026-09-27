-- Unlimited free Canopy Hunter expeditions for exempt accounts (founder/testing).
-- Adds a server-side exemption list consulted by the expedition entry gate in
-- the Keeper game. Everyone else keeps the weekly-free / paid-extra model.

CREATE TABLE IF NOT EXISTS public.canopy_hunter_exemptions (
  user_id uuid PRIMARY KEY,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canopy_hunter_exemptions ENABLE ROW LEVEL SECURITY;
-- No direct client access: everything flows through the function below.

-- True when the caller is exempt from expedition entry limits.
CREATE OR REPLACE FUNCTION public.canopy_hunter_is_exempt()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.canopy_hunter_exemptions WHERE user_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.canopy_hunter_is_exempt() FROM public;
GRANT EXECUTE ON FUNCTION public.canopy_hunter_is_exempt() TO authenticated;

-- Founder exemption: unlimited free expeditions for Gage's account only.
INSERT INTO public.canopy_hunter_exemptions (user_id, reason)
SELECT id, 'founder: unlimited free canopy hunter expeditions'
FROM auth.users
WHERE email = 'gageallanbunn@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
