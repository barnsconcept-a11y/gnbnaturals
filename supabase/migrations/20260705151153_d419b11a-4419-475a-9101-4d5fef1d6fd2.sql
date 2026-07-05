
-- Revoke default PUBLIC EXECUTE on internal SECURITY DEFINER functions and
-- restrict them to service_role only. These are called by cron/queue infra,
-- edge routes, or database triggers — never directly by clients.

REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;

REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;

REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_queue_wake() TO service_role;

-- get_order_status is server-side only; the /track page fetches via server route.
REVOKE ALL ON FUNCTION public.get_order_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_status(uuid) TO service_role;

-- Client-callable helpers: keep accessible to anon + authenticated.
REVOKE ALL ON FUNCTION public.get_pickup_locations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pickup_locations() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_gym_discounts_by_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_gym_discounts_by_name(text) TO anon, authenticated, service_role;

-- tg_set_updated_at is a trigger function; only needs table owner exec.
REVOKE ALL ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
