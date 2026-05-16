-- Orders table
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  customer_phone text not null,
  pickup_station text not null,
  items jsonb not null,
  total_amount numeric(10,2) not null,
  currency text not null default 'GHS',
  momo_reference text,
  proof_path text not null,
  status text not null default 'pending_review',
  notes text
);

alter table public.orders enable row level security;

-- Anyone can insert (public checkout, no auth)
create policy "Anyone can submit an order"
  on public.orders for insert
  to anon, authenticated
  with check (true);

-- No select/update/delete policies => denied for anon/authenticated; only service role (backend) sees them.

-- Private storage bucket for payment proofs
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Anyone can upload to the bucket
create policy "Anyone can upload payment proof"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'payment-proofs');
