-- 1. Restrict anonymous access to orders (fix orders_public_read_all)
DROP POLICY IF EXISTS "Anonymous can read orders by link" ON public.orders;

-- Safe RPC that returns only non-sensitive tracking fields for one order id.
-- Callers must know the UUID (unguessable), matching the "by link" model
-- without exposing full-table SELECT.
CREATE OR REPLACE FUNCTION public.get_order_status(order_id uuid)
RETURNS TABLE (
  id uuid,
  customer_name text,
  pickup_station text,
  total_amount numeric,
  total_crates integer,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.customer_name, o.pickup_station,
         o.total_amount, o.total_crates, o.status, o.created_at
  FROM public.orders o
  WHERE o.id = order_id
$$;

REVOKE ALL ON FUNCTION public.get_order_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_status(uuid) TO anon, authenticated;

-- Remove orders from the realtime publication so anon subscribers cannot
-- receive broadcasts for every order insert/update.
ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;

-- 2. Replace always-true INSERT policy on orders with real validation
-- (fix SUPA_rls_policy_always_true)
DROP POLICY IF EXISTS "Anyone can submit an order" ON public.orders;
CREATE POLICY "Anyone can submit an order"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending_review'
  AND currency = 'GHS'
  AND total_amount >= 0
  AND total_crates > 0
  AND length(btrim(customer_name)) BETWEEN 1 AND 200
  AND length(btrim(customer_phone)) BETWEEN 5 AND 30
  AND length(btrim(pickup_station)) > 0
  AND length(proof_path) > 0
  AND jsonb_typeof(items) = 'array'
);

-- 3. Set search_path on remaining mutable-search-path functions
-- (fix SUPA_function_search_path_mutable)
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pg_temp;

-- 4. Revoke EXECUTE from anon/authenticated on SECURITY DEFINER functions
-- that are only meant to be invoked by cron, triggers, or the service role
-- (fix SUPA_anon_/authenticated_security_definer_function_executable).
-- has_role, is_gym_owner_of, get_pickup_locations, get_order_status remain
-- callable because RLS policies and the client rely on them.
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_wake() TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;