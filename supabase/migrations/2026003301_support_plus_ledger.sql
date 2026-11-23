-- Support+ accounting hardening.
--
-- Invariants established here:
--   1. A deferred Support+ tip is an obligation, not artist revenue.
--   2. A tip can belong to at most one billing batch and one settlement.
--   3. Only a provider-confirmed billing batch can be settled.
--   4. Artist credits are append-only ledger entries and are applied at most once.
--   5. Provider webhook retries and settlement retries do not change the final balance.

-- ---------------------------------------------------------------------------
-- 1. Preserve support-time billing state instead of deriving it from users.plan later.
-- ---------------------------------------------------------------------------

alter table supports
  add column if not exists plan_at_support text,
  add column if not exists billing_period text,
  add column if not exists funding_status text not null default 'not_applicable',
  add column if not exists confirmed_at timestamptz;

-- Under the pre-ledger implementation, a positive support with no payment_id could only
-- be created by the deferred Support+ path. Paid one-time tips were inserted by the
-- verified Stripe webhook with payment_id populated.
update supports
set
  plan_at_support = case
    when amount_yen > 0 and payment_id is null then 'support_plus'
    else plan_at_support
  end,
  billing_period = case
    when amount_yen > 0 and payment_id is null
      then to_char(created_at at time zone 'UTC', 'YYYY-MM')
    else billing_period
  end,
  funding_status = case
    when amount_yen <= 0 then 'not_applicable'
    when payment_id is not null then 'confirmed'
    else 'pending'
  end,
  confirmed_at = case
    when amount_yen > 0 and payment_id is not null then coalesce(confirmed_at, created_at)
    else confirmed_at
  end;

alter table supports
  add constraint supports_plan_at_support_check
    check (plan_at_support is null or plan_at_support in ('free','standard','student','support_plus')),
  add constraint supports_billing_period_check
    check (billing_period is null or billing_period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  add constraint supports_funding_status_check
    check (funding_status in ('not_applicable','pending','confirmed','failed','refunded','disputed')),
  add constraint supports_support_plus_period_required_check
    check (plan_at_support is distinct from 'support_plus' or billing_period is not null);

create index if not exists supports_support_plus_pending_period_idx
  on supports (billing_period, user_id)
  where plan_at_support = 'support_plus'
    and amount_yen > 0
    and funding_status = 'pending';

-- ---------------------------------------------------------------------------
-- 2. Provider/payment evidence and Support+ billing batches.
-- ---------------------------------------------------------------------------

create table payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  provider_object_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table support_plus_billing_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  year_month text not null check (year_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  currency text not null default 'JPY' check (currency ~ '^[A-Z]{3}$'),
  gross_tips_yen bigint not null default 0 check (gross_tips_yen >= 0),
  status text not null default 'created'
    check (status in ('created','ready','invoice_item_created','paid','payment_failed')),
  stripe_invoice_item_id text unique,
  stripe_invoice_id text,
  created_at timestamptz not null default now(),
  invoice_item_created_at timestamptz,
  paid_at timestamptz,
  unique (user_id, year_month, currency)
);

create table support_plus_billing_items (
  billing_batch_id uuid not null references support_plus_billing_batches(id),
  support_id uuid not null references supports(id),
  amount_yen bigint not null check (amount_yen > 0),
  created_at timestamptz not null default now(),
  primary key (billing_batch_id, support_id),
  unique (support_id)
);

create index support_plus_billing_batches_period_status_idx
  on support_plus_billing_batches (year_month, status);

-- ---------------------------------------------------------------------------
-- 3. Settlement evidence and immutable artist balance ledger.
--    A settlement is scoped to one user/month billing batch. This lets confirmed
--    users settle independently if another user's subscription invoice is delayed.
-- ---------------------------------------------------------------------------

create table support_plus_settlements (
  id uuid primary key default gen_random_uuid(),
  billing_batch_id uuid not null unique references support_plus_billing_batches(id),
  year_month text not null check (year_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  currency text not null default 'JPY' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'created'
    check (status in ('created','processing','settled','failed')),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create table support_plus_settlement_items (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references support_plus_settlements(id),
  billing_batch_id uuid not null references support_plus_billing_batches(id),
  support_id uuid not null references supports(id),
  artist_id uuid not null references artists(id),
  gross_yen bigint not null check (gross_yen > 0),
  created_at timestamptz not null default now(),
  unique (settlement_id, support_id),
  unique (support_id)
);

create table support_plus_settlement_artist_credits (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references support_plus_settlements(id),
  artist_id uuid not null references artists(id),
  gross_yen bigint not null check (gross_yen > 0),
  fee_yen bigint not null check (fee_yen >= 0),
  net_yen bigint not null check (net_yen >= 0),
  pricing_policy_version int not null default 1,
  created_at timestamptz not null default now(),
  unique (settlement_id, artist_id),
  check (net_yen = gross_yen - fee_yen)
);

create table artist_balance_ledger (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists(id),
  entry_type text not null
    check (entry_type in ('support_plus_credit','tip_credit','boost_credit','refund','chargeback','adjustment','payout')),
  source_type text not null,
  source_id uuid not null,
  amount_yen bigint not null,
  currency text not null default 'JPY' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  unique (artist_id, entry_type, source_type, source_id)
);

create index artist_balance_ledger_artist_created_idx
  on artist_balance_ledger (artist_id, created_at);

-- New financial tables are server-only. service_role bypasses RLS; no client policies
-- are deliberately created.
alter table payment_events enable row level security;
alter table support_plus_billing_batches enable row level security;
alter table support_plus_billing_items enable row level security;
alter table support_plus_settlements enable row level security;
alter table support_plus_settlement_items enable row level security;
alter table support_plus_settlement_artist_credits enable row level security;
alter table artist_balance_ledger enable row level security;

-- Ledger entries are append-only even for privileged application code. Corrections are
-- represented by compensating entries rather than UPDATE/DELETE.
create or replace function reject_artist_balance_ledger_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'artist_balance_ledger is append-only; write a compensating entry instead';
end;
$$;

create trigger trg_artist_balance_ledger_append_only
before update or delete on artist_balance_ledger
for each row execute function reject_artist_balance_ledger_mutation();

-- Insert a ledger credit and update the materialized balance only if this source has
-- not been credited before. The function call is a single PostgreSQL transaction.
create or replace function credit_artist_once(
  p_artist_id uuid,
  p_entry_type text,
  p_source_type text,
  p_source_id uuid,
  p_amount_yen bigint,
  p_currency text default 'JPY'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted_amount bigint;
begin
  if p_amount_yen = 0 then
    return false;
  end if;

  insert into artist_balance_ledger (
    artist_id, entry_type, source_type, source_id, amount_yen, currency
  )
  values (
    p_artist_id, p_entry_type, p_source_type, p_source_id, p_amount_yen, p_currency
  )
  on conflict (artist_id, entry_type, source_type, source_id) do nothing
  returning amount_yen into v_inserted_amount;

  if v_inserted_amount is null then
    return false;
  end if;

  insert into artist_balances (artist_id, balance_yen, updated_at)
  values (p_artist_id, v_inserted_amount, now())
  on conflict (artist_id) do update
    set balance_yen = artist_balances.balance_yen + v_inserted_amount,
        updated_at = now();

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Billing preparation.
--    Calling this repeatedly returns the same frozen batch. A positive deferred tip
--    cannot be attached to two batches because support_id is unique.
-- ---------------------------------------------------------------------------

create or replace function prepare_support_plus_billing(p_year_month text)
returns table (
  batch_id uuid,
  user_id uuid,
  gross_tips_yen bigint,
  currency text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_year_month is null or p_year_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'invalid year_month: %', p_year_month;
  end if;

  insert into support_plus_billing_batches (user_id, year_month, currency)
  select distinct s.user_id, p_year_month, 'JPY'
  from supports s
  where s.plan_at_support = 'support_plus'
    and s.billing_period = p_year_month
    and s.amount_yen > 0
    and s.funding_status = 'pending'
    and not exists (
      select 1 from support_plus_billing_items bi where bi.support_id = s.id
    )
  on conflict (user_id, year_month, currency) do nothing;

  -- Once a batch is frozen, silently adding a late item would make the database amount
  -- diverge from the already-created Stripe invoice item. Fail closed instead.
  if exists (
    select 1
    from supports s
    join support_plus_billing_batches b
      on b.user_id = s.user_id
     and b.year_month = p_year_month
     and b.currency = 'JPY'
    where s.plan_at_support = 'support_plus'
      and s.billing_period = p_year_month
      and s.amount_yen > 0
      and s.funding_status = 'pending'
      and b.status <> 'created'
      and not exists (
        select 1 from support_plus_billing_items bi where bi.support_id = s.id
      )
  ) then
    raise exception 'Support+ billing period % already frozen but contains unbatched tips', p_year_month;
  end if;

  insert into support_plus_billing_items (billing_batch_id, support_id, amount_yen)
  select b.id, s.id, s.amount_yen::bigint
  from supports s
  join support_plus_billing_batches b
    on b.user_id = s.user_id
   and b.year_month = p_year_month
   and b.currency = 'JPY'
   and b.status = 'created'
  where s.plan_at_support = 'support_plus'
    and s.billing_period = p_year_month
    and s.amount_yen > 0
    and s.funding_status = 'pending'
  on conflict (support_id) do nothing;

  update support_plus_billing_batches b
  set gross_tips_yen = totals.total_yen
  from (
    select bi.billing_batch_id, sum(bi.amount_yen)::bigint as total_yen
    from support_plus_billing_items bi
    group by bi.billing_batch_id
  ) totals
  where b.id = totals.billing_batch_id
    and b.year_month = p_year_month
    and b.status = 'created';

  update support_plus_billing_batches
  set status = 'ready'
  where year_month = p_year_month
    and currency = 'JPY'
    and status = 'created'
    and gross_tips_yen > 0;

  return query
  select b.id, b.user_id, b.gross_tips_yen, b.currency
  from support_plus_billing_batches b
  where b.year_month = p_year_month
    and b.status = 'ready'
  order by b.user_id;
end;
$$;

create or replace function mark_support_plus_batch_invoice_item(
  p_batch_id uuid,
  p_stripe_invoice_item_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id text;
  v_status text;
begin
  select stripe_invoice_item_id, status
    into v_existing_id, v_status
  from support_plus_billing_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'Support+ billing batch not found: %', p_batch_id;
  end if;

  if v_existing_id is not null and v_existing_id <> p_stripe_invoice_item_id then
    raise exception 'Support+ billing batch % already points to another Stripe invoice item', p_batch_id;
  end if;

  if v_status not in ('ready','invoice_item_created','payment_failed','paid') then
    raise exception 'Support+ billing batch % cannot attach invoice item from status %', p_batch_id, v_status;
  end if;

  update support_plus_billing_batches
  set stripe_invoice_item_id = coalesce(stripe_invoice_item_id, p_stripe_invoice_item_id),
      invoice_item_created_at = coalesce(invoice_item_created_at, now()),
      status = case when status = 'paid' then 'paid' else 'invoice_item_created' end
  where id = p_batch_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Atomic confirmed-payment -> settlement -> artist-credit transition.
-- ---------------------------------------------------------------------------

create or replace function settle_support_plus_batch(p_batch_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch support_plus_billing_batches%rowtype;
  v_settlement_id uuid;
  v_settlement_status text;
  rec record;
begin
  select * into v_batch
  from support_plus_billing_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'Support+ billing batch not found: %', p_batch_id;
  end if;

  if v_batch.status <> 'paid' then
    return false;
  end if;

  if exists (
    select 1
    from support_plus_billing_items bi
    join supports s on s.id = bi.support_id
    where bi.billing_batch_id = p_batch_id
      and s.funding_status <> 'confirmed'
  ) then
    raise exception 'Support+ billing batch % contains an unconfirmed tip', p_batch_id;
  end if;

  insert into support_plus_settlements (billing_batch_id, year_month, currency)
  values (p_batch_id, v_batch.year_month, v_batch.currency)
  on conflict (billing_batch_id) do nothing;

  select id, status into v_settlement_id, v_settlement_status
  from support_plus_settlements
  where billing_batch_id = p_batch_id
  for update;

  if v_settlement_status = 'settled' then
    return false;
  end if;

  update support_plus_settlements
  set status = 'processing'
  where id = v_settlement_id;

  -- A support must never cross settlement boundaries. Treat that as corruption rather
  -- than silently ignoring it.
  if exists (
    select 1
    from support_plus_billing_items bi
    join support_plus_settlement_items si on si.support_id = bi.support_id
    where bi.billing_batch_id = p_batch_id
      and si.settlement_id <> v_settlement_id
  ) then
    raise exception 'a Support+ tip in batch % was already settled elsewhere', p_batch_id;
  end if;

  insert into support_plus_settlement_items (
    settlement_id, billing_batch_id, support_id, artist_id, gross_yen
  )
  select
    v_settlement_id,
    p_batch_id,
    bi.support_id,
    t.artist_id,
    bi.amount_yen
  from support_plus_billing_items bi
  join supports s on s.id = bi.support_id
  join tracks t on t.id = s.track_id
  where bi.billing_batch_id = p_batch_id
    and s.funding_status = 'confirmed'
  on conflict (settlement_id, support_id) do nothing;

  -- Preserve the pre-ledger economics: Stripe fee is rounded once per
  -- supporter/month/artist group (this settlement is already one supporter/month).
  insert into support_plus_settlement_artist_credits (
    settlement_id, artist_id, gross_yen, fee_yen, net_yen, pricing_policy_version
  )
  select
    v_settlement_id,
    si.artist_id,
    sum(si.gross_yen)::bigint,
    ceil(sum(si.gross_yen)::numeric * 0.036)::bigint,
    (sum(si.gross_yen)::bigint - ceil(sum(si.gross_yen)::numeric * 0.036)::bigint),
    1
  from support_plus_settlement_items si
  where si.settlement_id = v_settlement_id
  group by si.artist_id
  on conflict (settlement_id, artist_id) do nothing;

  for rec in
    select id, artist_id, net_yen
    from support_plus_settlement_artist_credits
    where settlement_id = v_settlement_id
    order by artist_id
  loop
    perform credit_artist_once(
      rec.artist_id,
      'support_plus_credit',
      'support_plus_settlement_artist_credit',
      rec.id,
      rec.net_yen,
      v_batch.currency
    );
  end loop;

  update support_plus_settlements
  set status = 'settled',
      settled_at = coalesce(settled_at, now())
  where id = v_settlement_id;

  return true;
end;
$$;

create or replace function confirm_support_plus_billing(
  p_batch_id uuid,
  p_stripe_invoice_id text,
  p_provider_event_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch support_plus_billing_batches%rowtype;
begin
  insert into payment_events (
    provider, provider_event_id, provider_object_id, event_type, payload
  )
  values (
    'stripe',
    p_provider_event_id,
    p_stripe_invoice_id,
    'invoice.paid',
    jsonb_build_object('support_plus_batch_id', p_batch_id)
  )
  on conflict (provider, provider_event_id) do nothing;

  select * into v_batch
  from support_plus_billing_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'Support+ billing batch not found: %', p_batch_id;
  end if;

  if v_batch.stripe_invoice_item_id is null then
    raise exception 'Support+ billing batch % has no Stripe invoice item', p_batch_id;
  end if;

  if v_batch.status not in ('invoice_item_created','payment_failed','paid') then
    raise exception 'Support+ billing batch % cannot be confirmed from status %', p_batch_id, v_batch.status;
  end if;

  update support_plus_billing_batches
  set status = 'paid',
      stripe_invoice_id = coalesce(stripe_invoice_id, p_stripe_invoice_id),
      paid_at = coalesce(paid_at, now())
  where id = p_batch_id;

  update supports s
  set funding_status = 'confirmed',
      confirmed_at = coalesce(confirmed_at, now())
  from support_plus_billing_items bi
  where bi.billing_batch_id = p_batch_id
    and bi.support_id = s.id
    and s.funding_status in ('pending','confirmed');

  return settle_support_plus_batch(p_batch_id);
end;
$$;

create or replace function mark_support_plus_billing_failed(
  p_batch_id uuid,
  p_stripe_invoice_id text,
  p_provider_event_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into payment_events (
    provider, provider_event_id, provider_object_id, event_type, payload
  )
  values (
    'stripe',
    p_provider_event_id,
    p_stripe_invoice_id,
    'invoice.payment_failed',
    jsonb_build_object('support_plus_batch_id', p_batch_id)
  )
  on conflict (provider, provider_event_id) do nothing;

  update support_plus_billing_batches
  set status = 'payment_failed',
      stripe_invoice_id = coalesce(stripe_invoice_id, p_stripe_invoice_id)
  where id = p_batch_id
    and status in ('invoice_item_created','payment_failed');
end;
$$;

-- Backward-compatible reconciliation entry point. It now settles paid batches only;
-- it never derives revenue directly from supports.amount_yen.
create or replace function settle_support_plus_tips(p_year_month text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  if p_year_month is null or p_year_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'invalid year_month: %', p_year_month;
  end if;

  for rec in
    select id
    from support_plus_billing_batches
    where year_month = p_year_month
      and status = 'paid'
    order by id
  loop
    perform settle_support_plus_batch(rec.id);
  end loop;
end;
$$;

comment on table support_plus_tip_batches is
  'Legacy pre-ledger Support+ table. Do not write new settlements here; use support_plus_billing_batches and support_plus_settlements.';

-- Money-moving RPCs are service-only.
revoke all on function credit_artist_once(uuid, text, text, uuid, bigint, text) from public, anon, authenticated;
revoke all on function prepare_support_plus_billing(text) from public, anon, authenticated;
revoke all on function mark_support_plus_batch_invoice_item(uuid, text) from public, anon, authenticated;
revoke all on function settle_support_plus_batch(uuid) from public, anon, authenticated;
revoke all on function confirm_support_plus_billing(uuid, text, text) from public, anon, authenticated;
revoke all on function mark_support_plus_billing_failed(uuid, text, text) from public, anon, authenticated;
revoke all on function settle_support_plus_tips(text) from public, anon, authenticated;

grant execute on function credit_artist_once(uuid, text, text, uuid, bigint, text) to service_role;
grant execute on function prepare_support_plus_billing(text) to service_role;
grant execute on function mark_support_plus_batch_invoice_item(uuid, text) to service_role;
grant execute on function settle_support_plus_batch(uuid) to service_role;
grant execute on function confirm_support_plus_billing(uuid, text, text) to service_role;
grant execute on function mark_support_plus_billing_failed(uuid, text, text) to service_role;
grant execute on function settle_support_plus_tips(text) to service_role;
