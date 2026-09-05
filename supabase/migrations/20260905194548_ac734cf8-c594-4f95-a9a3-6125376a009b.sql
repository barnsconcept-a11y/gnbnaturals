ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS unpaid_note text;

-- Prevent gym owners from flipping the paid flag themselves
DROP POLICY IF EXISTS "Gym owners update their gym orders" ON public.orders;
CREATE POLICY "Gym owners update their gym orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (private.is_gym_owner_of(pickup_station))
WITH CHECK (
  private.is_gym_owner_of(pickup_station)
  AND is_paid = (SELECT o.is_paid FROM public.orders o WHERE o.id = orders.id)
);