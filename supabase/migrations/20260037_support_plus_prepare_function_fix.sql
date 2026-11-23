-- prepare_support_plus_billing() はRETURNS TABLEの出力列名をPL/pgSQL変数として扱う。
-- user_id / currency / gross_tips_yen とテーブル列名が衝突し得るため、
-- ON CONFLICTの対象指定を不要な形へ変更し、更新対象列はaliasで明示する。

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
    raise exception 'year_monthが不正です: %', p_year_month;
  end if;

  insert into support_plus_billing_batches (user_id, year_month, currency)
  select distinct s.user_id, p_year_month, 'JPY'
  from supports s
  where s.plan_at_support = 'support_plus'
    and s.billing_period = p_year_month
    and s.amount_yen > 0
    and s.funding_status = 'pending'
    and not exists (
      select 1
      from support_plus_billing_items bi
      where bi.support_id = s.id
    )
  on conflict do nothing;

  -- batchを固定した後に同じ月の未収録tipが現れた場合、
  -- Stripe側の請求額とDB側の合計が乖離するためfail-closedにする。
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
        select 1
        from support_plus_billing_items bi
        where bi.support_id = s.id
      )
  ) then
    raise exception 'Support+請求月 % は既に固定済みですが未収録tipが存在します', p_year_month;
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

  update support_plus_billing_batches b
  set status = 'ready'
  where b.year_month = p_year_month
    and b.currency = 'JPY'
    and b.status = 'created'
    and b.gross_tips_yen > 0;

  return query
  select b.id, b.user_id, b.gross_tips_yen, b.currency
  from support_plus_billing_batches b
  where b.year_month = p_year_month
    and b.status = 'ready'
  order by b.user_id;
end;
$$;

revoke all on function prepare_support_plus_billing(text) from public, anon, authenticated;
grant execute on function prepare_support_plus_billing(text) to service_role;
