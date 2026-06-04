-- Public read for tracking page (UUIDs are unguessable, like a private link)
CREATE POLICY "Anyone with link can read order"
ON public.orders FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT ON public.orders TO anon;

-- Enable realtime so tracking page updates live
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;