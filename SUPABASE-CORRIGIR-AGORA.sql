-- Rode este arquivo no Supabase > SQL Editor > Run.
-- Corrige o erro: Could not find the table public.relpps_orders in the schema cache.

create table if not exists public.relpps_orders (
  id text primary key,
  status text not null default 'AWAITING_PAYMENT',
  payment_status text not null default 'AWAITING_PAYMENT',
  payment_method text not null,
  customer jsonb not null default '{}'::jsonb,
  delivery jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  totals jsonb not null default '{}'::jsonb,
  discounts jsonb not null default '{}'::jsonb,
  bling_order_id bigint,
  infinitepay_transaction_nsu text,
  infinitepay_invoice_slug text,
  infinitepay_receipt_url text,
  payment_url text,
  error_message text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists relpps_orders_bling_order_id_idx on public.relpps_orders (bling_order_id);
create index if not exists relpps_orders_infinitepay_transaction_idx on public.relpps_orders (infinitepay_transaction_nsu);
create index if not exists relpps_orders_created_at_idx on public.relpps_orders (created_at desc);
alter table public.relpps_orders enable row level security;

create table if not exists public.relpps_bling_oauth (
  id integer primary key check (id = 1),
  access_token text,
  refresh_token text,
  token_type text default 'Bearer',
  expires_in integer,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.relpps_bling_oauth enable row level security;
