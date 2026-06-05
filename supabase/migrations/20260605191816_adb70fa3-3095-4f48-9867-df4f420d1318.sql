CREATE POLICY "Public read recipe images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'recipe-images');

CREATE POLICY "Admins upload recipe images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'recipe-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update recipe images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'recipe-images' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'recipe-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete recipe images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'recipe-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));