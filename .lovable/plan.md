## What we're building

A `/admin` area where you (admin) see all orders across all gyms, and gym owners see only orders for their own gym(s) — with commission auto-calculated per crate.

## Database changes (one migration)

1. **`gyms` table** — `id`, `name` (matches the pickup station string), `commission_per_crate` (GHS, numeric), `active`. Seeded with your current pickup stations.
2. **`app_role` enum** — `admin`, `gym_owner`.
3. **`user_roles` table** — `user_id` → role. Separate from profiles (security best practice).
4. **`gym_owners` table** — links `user_id` ↔ `gym_id` (a user can own multiple gyms).
5. **`has_role()` security-definer function** — prevents RLS recursion.
6. **`is_gym_owner_of(gym_name)` helper** — checks if logged-in user owns that pickup station.
7. **Update `orders` table:**
   - Add `status` check: `pending_review`, `confirmed`, `picked_up`, `cancelled`, `refunded`
   - Add `total_crates` (derived from items, for commission math)
   - **New SELECT policies:** admins see all; gym owners see only orders where `pickup_station` matches one of their gyms
   - **New UPDATE policies:** admins update any order; gym owners can update status of their gym's orders
8. **Storage policies on `payment-proofs` bucket** — admins + matching gym owners can view proofs.

## Auth setup

- Email/password sign-in only (no public signup — you create accounts manually from the admin panel).
- Auto-confirm emails **on**, so accounts work immediately.
- `/auth` login page (no signup form visible).

## Pages

### `/auth`
Login form. Redirects to `/admin` on success.

### `/admin` (admin + gym_owner)
Auto-scoped by role:
- **Stats cards**: total orders, total revenue, total crates, total commission owed (admin sees all; gym owner sees their gym only).
- **Filters**: gym (admin only — gym owners locked to theirs), status, date range.
- **Orders table**: date, customer name + phone, pickup station, items breakdown, total, status badge, "View proof" button (opens MoMo screenshot), status dropdown (change to confirmed/picked_up/cancelled/refunded).
- **Per-gym commission summary** (admin only): list of gyms with crates sold × commission/crate = amount owed.

### `/admin/gyms` (admin only)
Create/edit gyms — set name (must match pickup station spelling) and commission per crate.

### `/admin/users` (admin only)
Create gym-owner accounts: enter email + temp password, pick which gym(s) they own. Share credentials manually.

## Out of scope for this build
- Recipes/articles CMS (waiting on your A vs B answer)
- Automated notifications to gym owners (can add later)
- Self-service password reset (admin can reset manually)

## Technical notes
- Auth uses Lovable Cloud's built-in email/password; session managed by `supabase.auth`.
- RLS policies do all the gym-scoping — no per-query filtering in the frontend, which means no chance of a gym owner accidentally seeing another gym's orders.
- Commission is computed live from `total_crates × gym.commission_per_crate` — never stored, so changing the rate updates historical reporting too. (Tell me if you'd rather lock commission at order time.)
