
CREATE TABLE IF NOT EXISTS public.gym_stack_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  stack_id text NOT NULL,
  crate_price numeric(10,2),
  stack_price numeric(10,2),
  discount_percent numeric(5,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id, stack_id),
  CHECK (crate_price IS NULL OR crate_price >= 0),
  CHECK (stack_price IS NULL OR stack_price >= 0),
  CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gym_stack_discounts TO authenticated;
GRANT ALL ON public.gym_stack_discounts TO service_role;

ALTER TABLE public.gym_stack_discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage discounts" ON public.gym_stack_discounts;
CREATE POLICY "Admins manage discounts"
  ON public.gym_stack_discounts
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Gym owners read own discounts" ON public.gym_stack_discounts;
CREATE POLICY "Gym owners read own discounts"
  ON public.gym_stack_discounts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gym_owners go
    WHERE go.gym_id = gym_stack_discounts.gym_id
      AND go.user_id = auth.uid()
  ));

DROP TRIGGER IF EXISTS set_gsd_updated_at ON public.gym_stack_discounts;
CREATE TRIGGER set_gsd_updated_at
  BEFORE UPDATE ON public.gym_stack_discounts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Safe public RPC: fetch discounts for one active gym by name (used by /order?gym=slug)
CREATE OR REPLACE FUNCTION public.get_gym_discounts_by_name(_name text)
RETURNS TABLE(stack_id text, crate_price numeric, stack_price numeric, discount_percent numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT d.stack_id, d.crate_price, d.stack_price, d.discount_percent
  FROM public.gym_stack_discounts d
  JOIN public.gyms g ON g.id = d.gym_id
  WHERE g.active = true AND lower(g.name) = lower(_name)
$$;

REVOKE ALL ON FUNCTION public.get_gym_discounts_by_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_gym_discounts_by_name(text) TO anon, authenticated;
