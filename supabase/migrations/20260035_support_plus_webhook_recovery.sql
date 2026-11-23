-- Strengthen the provider/DB boundary for Support+ billing.
--
-- A process can crash after Stripe creates an invoice item but before its ID is saved
-- locally. The signed invoice webhook is authoritative evidence of the invoice item
-- that actually reached the paid/failed invoice, so it may repair the missing local
-- provider ID before applying the state transition.

drop function if exists confirm_support_plus_billing(uuid, text, text);
drop function if exists mark_support_plus_billing_failed(uuid, text, text);

create or replace function confirm_support_plus_billing(
  p_batch_id uuid,
  p_stripe_invoice_item_id text,
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
  if coalesce(p_stripe_invoice_item_id, '') = ''
     or coalesce(p_stripe_invoice_id, '') = ''
     or coalesce(p_provider_event_id, '') = '' then
    raise exception 'provider identifiers are required to confirm Support+ billing';
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
      'stripe_invoice_item_id', p_stripe_invoice_item_id
    )
  )
  on conflict (provider, provider_event_id) do nothing;

  select * into v_batch
  from support_plus_billing_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'Support+ billing batch not found: %', p_batch_id;
  end if;

  if v_batch.stripe_invoice_item_id is not null
     and v_batch.stripe_invoice_item_id <> p_stripe_invoice_item_id then
    raise exception 'Support+ billing batch % is linked to a different Stripe invoice item', p_batch_id;
  end if;

  if v_batch.status not in ('ready','invoice_item_created','payment_failed','paid') then
    raise exception 'Support+ billing batch % cannot be confirmed from status %', p_batch_id, v_batch.status;
  end if;

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
  p_provider_event_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch support_plus_billing_batches%rowtype;
begin
  if coalesce(p_stripe_invoice_item_id, '') = ''
     or coalesce(p_stripe_invoice_id, '') = ''
     or coalesce(p_provider_event_id, '') = '' then
    raise exception 'provider identifiers are required to fail Support+ billing';
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
      'stripe_invoice_item_id', p_stripe_invoice_item_id
    )
  )
  on conflict (provider, provider_event_id) do nothing;

  select * into v_batch
  from support_plus_billing_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'Support+ billing batch not found: %', p_batch_id;
  end if;

  if v_batch.stripe_invoice_item_id is not null
     and v_batch.stripe_invoice_item_id <> p_stripe_invoice_item_id then
    raise exception 'Support+ billing batch % is linked to a different Stripe invoice item', p_batch_id;
  end if;

  -- A stale payment_failed event must never downgrade a batch already confirmed paid.
  if v_batch.status = 'paid' then
    return;
  end if;

  if v_batch.status not in ('ready','invoice_item_created','payment_failed') then
    raise exception 'Support+ billing batch % cannot fail from status %', p_batch_id, v_batch.status;
  end if;

  update support_plus_billing_batches
  set stripe_invoice_item_id = coalesce(stripe_invoice_item_id, p_stripe_invoice_item_id),
      invoice_item_created_at = coalesce(invoice_item_created_at, now()),
      stripe_invoice_id = coalesce(stripe_invoice_id, p_stripe_invoice_id),
      status = 'payment_failed'
  where id = p_batch_id;
end;
$$;

revoke all on function confirm_support_plus_billing(uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function mark_support_plus_billing_failed(uuid, text, text, text)
  from public, anon, authenticated;

grant execute on function confirm_support_plus_billing(uuid, text, text, text)
  to service_role;
grant execute on function mark_support_plus_billing_failed(uuid, text, text, text)
  to service_role;
