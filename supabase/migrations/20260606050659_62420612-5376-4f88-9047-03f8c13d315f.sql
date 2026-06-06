DROP POLICY IF EXISTS "Anyone can read published recipes" ON public.recipes;

CREATE POLICY "Anyone can read published recipes"
ON public.recipes
FOR SELECT
TO anon, authenticated
USING (published = true);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM service_role;