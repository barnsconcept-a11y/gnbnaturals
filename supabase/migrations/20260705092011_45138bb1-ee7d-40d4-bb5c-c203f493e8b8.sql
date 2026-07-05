CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_gym_owner_of(_station text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gym_owners go
    JOIN public.gyms g ON g.id = go.gym_id
    WHERE go.user_id = auth.uid() AND g.name = _station
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_gym_owner_of(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_gym_owner_of(text) TO anon, authenticated, service_role;

-- public policies
DROP POLICY IF EXISTS "Admins can view settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can upsert settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.app_settings;
CREATE POLICY "Admins can view settings" ON public.app_settings FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can upsert settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update settings" ON public.app_settings FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can read all articles" ON public.articles;
DROP POLICY IF EXISTS "Admins can insert articles" ON public.articles;
DROP POLICY IF EXISTS "Admins can update articles" ON public.articles;
DROP POLICY IF EXISTS "Admins can delete articles" ON public.articles;
CREATE POLICY "Admins can read all articles" ON public.articles FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert articles" ON public.articles FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update articles" ON public.articles FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete articles" ON public.articles FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage payouts" ON public.commission_payouts;
CREATE POLICY "Admins manage payouts" ON public.commission_payouts FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage gym memberships" ON public.gym_owners;
DROP POLICY IF EXISTS "Users see own gym memberships" ON public.gym_owners;
CREATE POLICY "Admins manage gym memberships" ON public.gym_owners FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users see own gym memberships" ON public.gym_owners FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage gyms" ON public.gyms;
DROP POLICY IF EXISTS "Admins or owners read gyms" ON public.gyms;
CREATE POLICY "Admins manage gyms" ON public.gyms FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins or owners read gyms" ON public.gyms FOR SELECT TO authenticated USING (
  private.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.gym_owners go WHERE go.gym_id = gyms.id AND go.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins read all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
DROP POLICY IF EXISTS "Gym owners read their gym orders" ON public.orders;
DROP POLICY IF EXISTS "Gym owners update their gym orders" ON public.orders;
CREATE POLICY "Admins read all orders" ON public.orders FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Gym owners read their gym orders" ON public.orders FOR SELECT TO authenticated USING (private.is_gym_owner_of(pickup_station));
CREATE POLICY "Gym owners update their gym orders" ON public.orders FOR UPDATE TO authenticated USING (private.is_gym_owner_of(pickup_station)) WITH CHECK (private.is_gym_owner_of(pickup_station));

DROP POLICY IF EXISTS "Admins manage recipes" ON public.recipes;
CREATE POLICY "Admins manage recipes" ON public.recipes FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users see their own roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users see their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

-- storage.objects
DROP POLICY IF EXISTS "Admins read all proofs" ON storage.objects;
CREATE POLICY "Admins read all proofs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'payment-proofs' AND private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins upload recipe images" ON storage.objects;
CREATE POLICY "Admins upload recipe images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'recipe-images' AND private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update recipe images" ON storage.objects;
CREATE POLICY "Admins update recipe images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'recipe-images' AND private.has_role(auth.uid(), 'admin')) WITH CHECK (bucket_id = 'recipe-images' AND private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete recipe images" ON storage.objects;
CREATE POLICY "Admins delete recipe images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'recipe-images' AND private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins upload article images" ON storage.objects;
CREATE POLICY "Admins upload article images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'article-images' AND private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update article images" ON storage.objects;
CREATE POLICY "Admins update article images" ON storage.objects FOR UPDATE USING (bucket_id = 'article-images' AND private.has_role(auth.uid(), 'admin')) WITH CHECK (bucket_id = 'article-images' AND private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete article images" ON storage.objects;
CREATE POLICY "Admins delete article images" ON storage.objects FOR DELETE USING (bucket_id = 'article-images' AND private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Gym owners read proofs for their orders" ON storage.objects;
CREATE POLICY "Gym owners read proofs for their orders" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs' AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.proof_path = objects.name AND private.is_gym_owner_of(o.pickup_station)
    )
  );

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_gym_owner_of(text);