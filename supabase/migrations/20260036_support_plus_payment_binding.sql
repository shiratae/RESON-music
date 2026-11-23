-- Support+の精算を、Stripeで実際に確認した請求項目の
-- 金額・通貨・顧客・invoiceへ強く拘束する。
-- metadata上のbatch IDだけではartist creditを確定しない。

-- 旧4引数版はこのmigrationで置き換える。
drop function if exists confirm_support_plus_billing(uuid, text, text, text);
drop function if exists mark_support_plus_billing_failed(uuid, text, text, text);

create or replace function confirm_support_plus_billing(
  p_batch_id uuid,
  p_stripe_invoice_item_id text,
  p_stripe_invoice_id text,
  p_provider_event_id text,
  p_provider_amount_yen bigint,
  p_provider_currency text,
  p_stripe_customer_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch support_plus_billing_batches%rowtype;
  v_expected_customer_id text;
  v_items_total bigint;
begin
  if coalesce(p_stripe_invoice_item_id, '') = ''
     or coalesce(p_stripe_invoice_id, '') = ''
     or coalesce(p_provider_event_id, '') = ''
     or coalesce(p_stripe_customer_id, '') = '' then
    raise exception 'Support+決済確認にはprovider識別子とStripe customer IDが必要です';
  end if;

  if p_provider_amount_yen is null or p_provider_amount_yen <= 0 then
    raise exception 'Support+決済確認額が不正です: %', p_provider_amount_yen;
  end if;

  select * into v_batch
  from support_plus_billing_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'Support+ billing batchが見つかりません: %', p_batch_id;
  end if;

  select stripe_customer_id into v_expected_customer_id
  from users
  where id = v_batch.user_id;

  if coalesce(v_expected_customer_id, '') = ''
     or v_expected_customer_id <> p_stripe_customer_id then
    raise exception 'Support+ batch % のStripe customerが一致しません', p_batch_id;
  end if;

  if v_batch.stripe_invoice_item_id is not null
     and v_batch.stripe_invoice_item_id <> p_stripe_invoice_item_id then
    raise exception 'Support+ batch % は別のStripe invoice itemへ紐付いています', p_batch_id;
  end if;

  if v_batch.stripe_invoice_id is not null
     and v_batch.stripe_invoice_id <> p_stripe_invoice_id then
    raise exception 'Support+ batch % は別のStripe invoiceへ紐付いています', p_batch_id;
  end if;

  if v_batch.gross_tips_yen <> p_provider_amount_yen then
    raise exception 'Support+ batch % のDB金額 % とStripe請求額 % が一致しません',
      p_batch_id, v_batch.gross_tips_yen, p_provider_amount_yen;
  end if;

  if v_batch.currency <> upper(coalesce(p_provider_currency, '')) then
    raise exception 'Support+ batch % の通貨 % とStripe通貨 % が一致しません',
      p_batch_id, v_batch.currency, p_provider_currency;
  end if;

  select coalesce(sum(amount_yen), 0)::bigint into v_items_total
  from support_plus_billing_items
  where billing_batch_id = p_batch_id;

  if v_items_total <> v_batch.gross_tips_yen then
    raise exception 'Support+ batch % の明細合計 % とbatch合計 % が一致しません',
      p_batch_id, v_items_total, v_batch.gross_tips_yen;
  end if;

  if v_batch.status not in ('ready','invoice_item_created','payment_failed','paid') then
    raise exception 'Support+ batch % はstatus % からpaidへ遷移できません', p_batch_id, v_batch.status;
  end if;

  insert into payment_events (
    provider, provider_event_id, provider_object_id, event_type, payload
  )
  values (
    'stripe',
    p_provider_event_id,
    p_stripe_invoice_id,
    'invoice.paid',
    jsonb_build_object(
      'support_plus_batch_id', p_batch_id,
      'stripe_invoice_item_id', p_stripe_invoice_item_id,
      'amount_yen', p_provider_amount_yen,
      'currency', upper(p_provider_currency),
      'stripe_customer_id', p_stripe_customer_id
    )
  )
  on conflict (provider, provider_event_id) do nothing;

  update support_plus_billing_batches
  set stripe_invoice_item_id = coalesce(stripe_invoice_item_id, p_stripe_invoice_item_id),
      invoice_item_created_at = coalesce(invoice_item_created_at, now()),
      status = 'paid',
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
  p_stripe_invoice_item_id text,
  p_stripe_invoice_id text,
  p_provider_event_id text,
  p_provider_amount_yen bigint,
  p_provider_currency text,
  p_stripe_customer_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch support_plus_billing_batches%rowtype;
  v_expected_customer_id text;
  v_items_total bigint;
begin
  if coalesce(p_stripe_invoice_item_id, '') = ''
     or coalesce(p_stripe_invoice_id, '') = ''
     or coalesce(p_provider_event_id, '') = ''
     or coalesce(p_stripe_customer_id, '') = '' then
    raise exception 'Support+決済失敗記録にはprovider識別子とStripe customer IDが必要です';
  end if;

  if p_provider_amount_yen is null or p_provider_amount_yen <= 0 then
    raise exception 'Support+決済失敗時の請求額が不正です: %', p_provider_amount_yen;
  end if;

  select * into v_batch
  from support_plus_billing_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'Support+ billing batchが見つかりません: %', p_batch_id;
  end if;

  select stripe_customer_id into v_expected_customer_id
  from users
  where id = v_batch.user_id;

  if coalesce(v_expected_customer_id, '') = ''
     or v_expected_customer_id <> p_stripe_customer_id then
    raise exception 'Support+ batch % のStripe customerが一致しません', p_batch_id;
  end if;

  if v_batch.stripe_invoice_item_id is not null
     and v_batch.stripe_invoice_item_id <> p_stripe_invoice_item_id then
    raise exception 'Support+ batch % は別のStripe invoice itemへ紐付いています', p_batch_id;
  end if;

  if v_batch.stripe_invoice_id is not null
     and v_batch.stripe_invoice_id <> p_stripe_invoice_id then
    raise exception 'Support+ batch % は別のStripe invoiceへ紐付いています', p_batch_id;
  end if;

  if v_batch.gross_tips_yen <> p_provider_amount_yen then
    raise exception 'Support+ batch % のDB金額 % とStripe請求額 % が一致しません',
      p_batch_id, v_batch.gross_tips_yen, p_provider_amount_yen;
  end if;

  if v_batch.currency <> upper(coalesce(p_provider_currency, '')) then
    raise exception 'Support+ batch % の通貨 % とStripe通貨 % が一致しません',
      p_batch_id, v_batch.currency, p_provider_currency;
  end if;

  select coalesce(sum(amount_yen), 0)::bigint into v_items_total
  from support_plus_billing_items
  where billing_batch_id = p_batch_id;

  if v_items_total <> v_batch.gross_tips_yen then
    raise exception 'Support+ batch % の明細合計 % とbatch合計 % が一致しません',
      p_batch_id, v_items_total, v_batch.gross_tips_yen;
  end if;

  insert into payment_events (
    provider, provider_event_id, provider_object_id, event_type, payload
  )
  values (
    'stripe',
    p_provider_event_id,
    p_stripe_invoice_id,
    'invoice.payment_failed',
    jsonb_build_object(
      'support_plus_batch_id', p_batch_id,
      'stripe_invoice_item_id', p_stripe_invoice_item_id,
      'amount_yen', p_provider_amount_yen,
      'currency', upper(p_provider_currency),
      'stripe_customer_id', p_stripe_customer_id
    )
  )
  on conflict (provider, provider_event_id) do nothing;

  -- paid確定後に古いpayment_failedが到着しても状態を巻き戻さない。
  if v_batch.status = 'paid' then
    return;
  end if;

  if v_batch.status not in ('ready','invoice_item_created','payment_failed') then
    raise exception 'Support+ batch % はstatus % からpayment_failedへ遷移できません', p_batch_id, v_batch.status;
  end if;

  update support_plus_billing_batches
  set stripe_invoice_item_id = coalesce(stripe_invoice_item_id, p_stripe_invoice_item_id),
      invoice_item_created_at = coalesce(invoice_item_created_at, now()),
      stripe_invoice_id = coalesce(stripe_invoice_id, p_stripe_invoice_id),
      status = 'payment_failed'
  where id = p_batch_id;
end;
$$;

revoke all on function confirm_support_plus_billing(uuid, text, text, text, bigint, text, text)
  from public, anon, authenticated;
revoke all on function mark_support_plus_billing_failed(uuid, text, text, text, bigint, text, text)
  from public, anon, authenticated;

grant execute on function confirm_support_plus_billing(uuid, text, text, text, bigint, text, text)
  to service_role;
grant execute on function mark_support_plus_billing_failed(uuid, text, text, text, bigint, text, text)
  to service_role;
