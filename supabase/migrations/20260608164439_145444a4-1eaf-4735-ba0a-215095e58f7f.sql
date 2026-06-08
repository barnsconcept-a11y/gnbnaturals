ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY['pending_review'::text, 'confirmed'::text, 'ready'::text, 'picked_up'::text, 'cancelled'::text, 'refunded'::text]));