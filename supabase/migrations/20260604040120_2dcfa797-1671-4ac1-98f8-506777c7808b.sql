-- Public function to expose active gym names (and IDs) for pickup selection
CREATE OR REPLACE FUNCTION public.get_pickup_locations()
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name FROM public.gyms WHERE active = true ORDER BY name;
$$;

GRANT EXECUTE ON FUNCTION public.get_pickup_locations() TO anon, authenticated;

-- Tighten gyms SELECT: admins see all; gym owners only their own gyms.
-- Pickup selection no longer reads gyms directly; it uses the function above.
DROP POLICY IF EXISTS "Anyone authenticated can read gyms" ON public.gyms;

CREATE POLICY "Admins or owners read gyms"
ON public.gyms
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.gym_owners go
    WHERE go.gym_id = gyms.id AND go.user_id = auth.uid()
  )
);