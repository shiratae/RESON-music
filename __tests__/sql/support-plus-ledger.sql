\set ON_ERROR_STOP on

create extension if not exists pgcrypto;
create role anon;
create role authenticated;
create role service_role;

-- 新規migrationが依存する既存スキーマの最小構成。
create table users (
  id uuid primary key,
  stripe_customer_id text
);

create table artists (
  id uuid primary key,
  user_id uuid not null references users(id)
);

create table tracks (
  id uuid primary key,
  artist_id uuid not null references artists(id)
);

create table supports (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references tracks(id),
  user_id uuid not null references users(id),
  amount_yen int not null default 0,
  payment_id text,
  created_at timestamptz not null default now()
);

create table artist_balances (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null unique references artists(id),
  balance_yen numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table support_plus_tip_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  year_month text not null,
  total_tips_yen numeric not null,
  stripe_fee_yen int not null,
  net_yen numeric not null,
  processed bool not null default false
);

-- 旧実装で既に月次精算へ触れた可能性のあるデータ。
insert into users (id, stripe_customer_id)
values ('00000000-0000-0000-0000-000000000001', 'cus_legacy');
insert into artists (id, user_id)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');
insert into tracks (id, artist_id)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');
insert into supports (id, track_id, user_id, amount_yen, payment_id, created_at)
values (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  1000,
  null,
  '2026-08-15T12:00:00Z'
);
insert into support_plus_tip_batches (
  id, user_id, year_month, total_tips_yen, stripe_fee_yen, net_yen, processed
) values (
  '40000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '2026-08',
  1000,
  36,
  964,
  true
);

\ir ../../supabase/migrations/2026003301_support_plus_ledger.sql
\ir ../../supabase/migrations/20260034_support_plus_legacy_quarantine.sql
\ir ../../supabase/migrations/20260035_support_plus_webhook_recovery.sql
\ir ../../supabase/migrations/20260036_support_plus_payment_binding.sql
\ir ../../supabase/migrations/20260037_support_plus_prepare_function_fix.sql

-- 旧月次精算に触れた可能性があるデータを自動再請求してはならない。
do $$
begin
  if (select funding_status from supports where id = '30000000-0000-0000-0000-000000000001')
       <> 'legacy_unverified' then
    raise exception 'テスト失敗: 旧Support+データがlegacy_unverifiedへ隔離されていません';
  end if;
end;
$$;

-- 新しいSupport+投げ銭を作成する。
insert into users (id, stripe_customer_id)
values ('00000000-0000-0000-0000-000000000002', 'cus_test');
insert into artists (id, user_id)
values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002');
insert into tracks (id, artist_id)
values ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002');
insert into supports (
  id, track_id, user_id, amount_yen, payment_id, created_at,
  plan_at_support, billing_period, funding_status
) values (
  '30000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  1500,
  null,
  '2026-08-20T12:00:00Z',
  'support_plus',
  '2026-08',
  'pending'
);

select * from prepare_support_plus_billing('2026-08');

-- batchは1件だけ作られ、DB合計が明細合計と一致していること。
do $$
declare
  v_count bigint;
  v_gross bigint;
  v_items bigint;
begin
  select count(*), max(gross_tips_yen)
    into v_count, v_gross
  from support_plus_billing_batches
  where user_id = '00000000-0000-0000-0000-000000000002'
    and year_month = '2026-08';

  select coalesce(sum(bi.amount_yen), 0)::bigint
    into v_items
  from support_plus_billing_items bi
  join support_plus_billing_batches b on b.id = bi.billing_batch_id
  where b.user_id = '00000000-0000-0000-0000-000000000002'
    and b.year_month = '2026-08';

  if v_count <> 1 or v_gross <> 1500 or v_items <> 1500 then
    raise exception 'テスト失敗: Support+ billing batchの固定結果が不正です';
  end if;
end;
$$;

select mark_support_plus_batch_invoice_item(
  (select id from support_plus_billing_batches
    where user_id = '00000000-0000-0000-0000-000000000002'
      and year_month = '2026-08'),
  'ii_test'
);

-- Stripe側の金額がDBより少ない場合は、paid/creditへ進めてはならない。
do $$
declare
  v_batch_id uuid;
  v_expected_error boolean := false;
begin
  select id into v_batch_id
  from support_plus_billing_batches
  where user_id = '00000000-0000-0000-0000-000000000002'
    and year_month = '2026-08';

  begin
    perform confirm_support_plus_billing(
      v_batch_id,
      'ii_test',
      'in_test',
      'evt_wrong_amount',
      1499,
      'JPY',
      'cus_test'
    );
  exception when others then
    if position('DB金額' in sqlerrm) > 0 then
      v_expected_error := true;
    else
      raise;
    end if;
  end;

  if not v_expected_error then
    raise exception 'テスト失敗: Stripe金額不一致を受理しました';
  end if;

  if exists (select 1 from payment_events where provider_event_id = 'evt_wrong_amount') then
    raise exception 'テスト失敗: 拒否した決済イベントを確定証跡として保存しました';
  end if;
end;
$$;

-- 別のStripe customerに属する請求項目も拒否する。
do $$
declare
  v_batch_id uuid;
  v_expected_error boolean := false;
begin
  select id into v_batch_id
  from support_plus_billing_batches
  where user_id = '00000000-0000-0000-0000-000000000002'
    and year_month = '2026-08';

  begin
    perform confirm_support_plus_billing(
      v_batch_id,
      'ii_test',
      'in_test',
      'evt_wrong_customer',
      1500,
      'JPY',
      'cus_other'
    );
  exception when others then
    if position('Stripe customer' in sqlerrm) > 0 then
      v_expected_error := true;
    else
      raise;
    end if;
  end;

  if not v_expected_error then
    raise exception 'テスト失敗: Stripe customer不一致を受理しました';
  end if;
end;
$$;

-- 正しいinvoice.paidだけが精算と残高加算を行う。
select confirm_support_plus_billing(
  (select id from support_plus_billing_batches
    where user_id = '00000000-0000-0000-0000-000000000002'
      and year_month = '2026-08'),
  'ii_test',
  'in_test',
  'evt_paid',
  1500,
  'JPY',
  'cus_test'
);

do $$
declare
  v_balance numeric;
  v_ledger_count bigint;
  v_ledger_amount bigint;
  v_settlement_status text;
  v_support_status text;
begin
  select balance_yen into v_balance
  from artist_balances
  where artist_id = '10000000-0000-0000-0000-000000000002';

  select count(*), max(amount_yen)
    into v_ledger_count, v_ledger_amount
  from artist_balance_ledger
  where artist_id = '10000000-0000-0000-0000-000000000002'
    and entry_type = 'support_plus_credit';

  select ss.status into v_settlement_status
  from support_plus_settlements ss
  join support_plus_billing_batches b on b.id = ss.billing_batch_id
  where b.user_id = '00000000-0000-0000-0000-000000000002'
    and b.year_month = '2026-08';

  select funding_status into v_support_status
  from supports
  where id = '30000000-0000-0000-0000-000000000002';

  -- ceil(1500 * 3.6%) = 54, net = 1446
  if v_balance <> 1446
     or v_ledger_count <> 1
     or v_ledger_amount <> 1446
     or v_settlement_status <> 'settled'
     or v_support_status <> 'confirmed' then
    raise exception 'テスト失敗: 正常精算後の会計状態が不正です';
  end if;
end;
$$;

-- 同じWebhookの再送、さらに別event IDでの重複通知でも残高は増えない。
select confirm_support_plus_billing(
  (select id from support_plus_billing_batches
    where user_id = '00000000-0000-0000-0000-000000000002'
      and year_month = '2026-08'),
  'ii_test', 'in_test', 'evt_paid', 1500, 'JPY', 'cus_test'
);

select confirm_support_plus_billing(
  (select id from support_plus_billing_batches
    where user_id = '00000000-0000-0000-0000-000000000002'
      and year_month = '2026-08'),
  'ii_test', 'in_test', 'evt_paid_duplicate', 1500, 'JPY', 'cus_test'
);

do $$
begin
  if (select balance_yen from artist_balances
      where artist_id = '10000000-0000-0000-0000-000000000002') <> 1446 then
    raise exception 'テスト失敗: confirm再実行で残高が二重加算されました';
  end if;

  if (select count(*) from artist_balance_ledger
      where artist_id = '10000000-0000-0000-0000-000000000002'
        and entry_type = 'support_plus_credit') <> 1 then
    raise exception 'テスト失敗: confirm再実行でledgerが重複しました';
  end if;
end;
$$;

-- paid後に古いpayment_failedが届いても状態を巻き戻さない。
select mark_support_plus_billing_failed(
  (select id from support_plus_billing_batches
    where user_id = '00000000-0000-0000-0000-000000000002'
      and year_month = '2026-08'),
  'ii_test',
  'in_test',
  'evt_failed_late',
  1500,
  'JPY',
  'cus_test'
);

do $$
begin
  if (select status from support_plus_billing_batches
      where user_id = '00000000-0000-0000-0000-000000000002'
        and year_month = '2026-08') <> 'paid' then
    raise exception 'テスト失敗: 古いpayment_failedでpaid状態が巻き戻りました';
  end if;

  if (select balance_yen from artist_balances
      where artist_id = '10000000-0000-0000-0000-000000000002') <> 1446 then
    raise exception 'テスト失敗: payment_failed再送で残高が変化しました';
  end if;
end;
$$;

select 'Support+会計migration統合テスト成功' as result;
