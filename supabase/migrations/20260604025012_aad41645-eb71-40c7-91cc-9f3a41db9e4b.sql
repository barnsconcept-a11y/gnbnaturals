
-- 1. Gyms table
CREATE TABLE public.gyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  commission_per_crate numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gyms TO authenticated;
GRANT ALL ON public.gyms TO service_role;
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

-- 2. Roles enum + user_roles
CREATE TYPE public.app_role AS ENUM ('admin', 'gym_owner');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Gym owners mapping
CREATE TABLE public.gym_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, gym_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gym_owners TO authenticated;
GRANT ALL ON public.gym_owners TO service_role;
ALTER TABLE public.gym_owners ENABLE ROW LEVEL SECURITY;

-- 4. has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. is_gym_owner_of(station_name)
CREATE OR REPLACE FUNCTION public.is_gym_owner_of(_station text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gym_owners go
    JOIN public.gyms g ON g.id = go.gym_id
    WHERE go.user_id = auth.uid()
      AND g.name = _station
  )
$$;

-- 6. updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER gyms_updated_at
  BEFORE UPDATE ON public.gyms
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 7. RLS policies on gyms
CREATE POLICY "Anyone authenticated can read gyms"
  ON public.gyms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage gyms"
  ON public.gyms FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. RLS on user_roles
CREATE POLICY "Users see their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. RLS on gym_owners
CREATE POLICY "Users see own gym memberships"
  ON public.gym_owners FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage gym memberships"
  ON public.gym_owners FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 10. Orders: add total_crates + status check, new SELECT/UPDATE policies
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS total_crates integer NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending_review','confirmed','picked_up','cancelled','refunded'));

CREATE POLICY "Admins read all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gym owners read their gym orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.is_gym_owner_of(pickup_station));

CREATE POLICY "Admins update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gym owners update their gym orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_gym_owner_of(pickup_station))
  WITH CHECK (public.is_gym_owner_of(pickup_station));

-- 11. Storage policies for payment-proofs
CREATE POLICY "Admins read all proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gym owners read proofs for their orders"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.proof_path = storage.objects.name
        AND public.is_gym_owner_of(o.pickup_station)
    )
  );

-- 12. Seed gyms with existing pickup stations (commission set to 0; admin can edit)
INSERT INTO public.gyms (name, commission_per_crate) VALUES
  ('Pulse Fitness — Osu', 0),
  ('Fitness Vault — East Legon', 0),
  ('Body Tech Gym — Spintex', 0),
  ('Accra Sports Stadium Gym', 0),
  ('Lifestyle Gym — Airport Residential', 0),
  ('Bond''s Gym — Adenta', 0),
  ('The Matrix Gym — Legon', 0),
  ('Fit Dons — Adenta', 0),
  ('The Klus Fitness Club', 0),
  ('Gym Ike Fitness & Health Club Center', 0)
ON CONFLICT (name) DO NOTHING;
