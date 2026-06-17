
CREATE POLICY "Admins upload article images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'article-images' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update article images" ON storage.objects FOR UPDATE
  USING (bucket_id = 'article-images' AND has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'article-images' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete article images" ON storage.objects FOR DELETE
  USING (bucket_id = 'article-images' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Public read article images" ON storage.objects FOR SELECT
  USING (bucket_id = 'article-images');
