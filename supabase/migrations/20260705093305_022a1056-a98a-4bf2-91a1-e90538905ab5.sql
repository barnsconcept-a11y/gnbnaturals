
ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

DELETE FROM public.commission_payouts;
DELETE FROM public.orders;

DROP POLICY IF EXISTS "Admins manage gym images" ON storage.objects;
CREATE POLICY "Admins manage gym images"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'gym-images' AND private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'gym-images' AND private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated read gym images" ON storage.objects;
CREATE POLICY "Authenticated read gym images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'gym-images');
