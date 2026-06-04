DROP POLICY IF EXISTS "Anyone with link can read order" ON public.orders;

CREATE POLICY "Anonymous can read orders by link"
ON public.orders
FOR SELECT
TO anon
USING (true);
