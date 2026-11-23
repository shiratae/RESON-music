-- An earlier default of true cannot prove that a listener made an informed choice.
-- Require a fresh affirmative choice before using listening history for optional features.
alter table public.user_settings alter column listening_data_use set default false;
alter table public.user_settings alter column profile_public set default false;
alter table public.user_settings alter column feed_enabled set default false;
update public.user_settings set listening_data_use = false where listening_data_use = true;

-- Use a narrow boolean helper so public profile/post policies can inspect the
-- owner's settings without exposing their full settings row through the Data API.
create schema if not exists private;
create or replace function private.can_view_profile(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) = p_user_id or exists (
    select 1 from public.user_settings s
    where s.user_id = p_user_id and s.profile_public and not s.is_private
  );
$$;
create or replace function private.can_view_public_post(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) = p_user_id or exists (
    select 1 from public.user_settings s
    where s.user_id = p_user_id and s.feed_enabled and not s.is_private
  );
$$;
revoke all on function private.can_view_profile(uuid) from public;
revoke all on function private.can_view_public_post(uuid) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.can_view_profile(uuid) to anon, authenticated;
grant execute on function private.can_view_public_post(uuid) to anon, authenticated;

drop policy if exists "user_profiles_public_read" on public.user_profiles;
create policy user_profiles_visible_or_owner on public.user_profiles for select
  to anon, authenticated using (private.can_view_profile(user_id));
drop policy if exists "posts_public_read" on public.posts;
create policy posts_visible_or_owner on public.posts for select
  to anon, authenticated using (
    (select auth.uid()) = author_user_id or
    (visibility = 'public' and status = 'active' and deleted_at is null
      and private.can_view_public_post(author_user_id))
  );
drop policy if exists "comments_public_read" on public.comments;
create policy comments_on_visible_posts_or_owner on public.comments for select
  to anon, authenticated using (
    (select auth.uid()) = user_id or exists (
      select 1 from public.posts p where p.id = post_id
    )
  );

-- Keep a tamper-resistant record of optional listening-data choices.
create table public.privacy_consent_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id),
  purpose text not null check (purpose = 'listening_personalization'),
  granted boolean not null,
  notice_version text not null,
  source text not null check (source in ('user', 'operator')),
  recorded_at timestamptz not null default now()
);
create index privacy_consent_events_user_idx
  on public.privacy_consent_events(user_id, recorded_at desc);
alter table public.privacy_consent_events enable row level security;
revoke all on public.privacy_consent_events from anon, authenticated;
grant select on public.privacy_consent_events to authenticated;
create policy privacy_consent_events_self_select on public.privacy_consent_events
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function private.record_listening_consent()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    if NEW.listening_data_use is not distinct from OLD.listening_data_use then
      return NEW;
    end if;
  end if;
  insert into public.privacy_consent_events
    (user_id, purpose, granted, notice_version, source)
  values (
    NEW.user_id, 'listening_personalization', NEW.listening_data_use,
    '2026-09-19',
    case when (select auth.uid()) = NEW.user_id then 'user' else 'operator' end
  );
  return NEW;
end;
$$;
revoke all on function private.record_listening_consent() from public;
create trigger trg_record_listening_consent
  after insert or update of listening_data_use on public.user_settings
  for each row execute function private.record_listening_consent();

-- Each request is visible to its owner. Only trusted staff can change its status.
create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  request_type text not null check (request_type in
    ('access', 'portability', 'erasure', 'rectification', 'restriction', 'objection')),
  details text not null default '' check (char_length(details) <= 2000),
  status text not null default 'received' check (status in
    ('received', 'in_progress', 'completed', 'declined')),
  response text check (char_length(response) <= 4000),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create index privacy_requests_user_created_idx
  on public.privacy_requests(user_id, created_at desc);
create index privacy_requests_open_idx
  on public.privacy_requests(created_at) where status in ('received', 'in_progress');
create unique index privacy_requests_one_open_type_idx
  on public.privacy_requests(user_id, request_type)
  where status in ('received', 'in_progress');
alter table public.privacy_requests enable row level security;
revoke all on public.privacy_requests from anon, authenticated;
grant select on public.privacy_requests to authenticated;
grant insert (user_id, request_type, details) on public.privacy_requests to authenticated;
create policy privacy_requests_self_select on public.privacy_requests
  for select to authenticated using ((select auth.uid()) = user_id);
create policy privacy_requests_self_insert on public.privacy_requests
  for insert to authenticated with check (
    (select auth.uid()) = user_id and status = 'received'
    and response is null and responded_at is null
  );
-- There is deliberately no authenticated UPDATE or DELETE policy.
