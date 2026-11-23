-- Security hardening v2: prevent direct privilege writes and private-media leaks.

-- Public artist rows must not contain guardian contact information.  Move all
-- consent data to a service-role-only table before removing the public columns.
create table artist_guardian_consents (
  artist_id uuid primary key references artists(id) on delete cascade,
  is_minor bool not null,
  parent_consent_name text,
  parent_consent_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into artist_guardian_consents (artist_id, is_minor, parent_consent_name, parent_consent_contact)
select id, is_minor, parent_consent_name, parent_consent_contact
from artists
on conflict (artist_id) do update set
  is_minor = excluded.is_minor,
  parent_consent_name = excluded.parent_consent_name,
  parent_consent_contact = excluded.parent_consent_contact,
  updated_at = now();

alter table artist_guardian_consents enable row level security;
-- No client policy: guardian data is accessed only by trusted server code.

alter table artists
  drop column if exists is_minor,
  drop column if exists parent_consent_name,
  drop column if exists parent_consent_contact;

-- Artist and track creation has validation and server-owned defaults in Route
-- Handlers.  Direct Supabase inserts must not be able to forge those fields.
drop policy if exists "artists_owner_insert" on artists;
drop policy if exists "tracks_owner_insert" on tracks;

-- The verification RPC below changes student_verified atomically with the
-- verification record.  Its transaction-local marker cannot be supplied by a
-- normal PostgREST table request, unlike the service_role JWT.
create or replace function protect_users_server_fields()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and coalesce(current_setting('reson.internal_student_verification', true), '') <> 'on' then
    if NEW.plan is distinct from OLD.plan
      or NEW.student_verified is distinct from OLD.student_verified
      or NEW.parent_user_id is distinct from OLD.parent_user_id
      or NEW.stripe_customer_id is distinct from OLD.stripe_customer_id
      or NEW.is_admin is distinct from OLD.is_admin then
      raise exception 'server-managed user fields cannot be changed directly';
    end if;
  end if;
  return NEW;
end;
$$;

-- Do not expose pending/rejected rows (or their R2 object keys) to arbitrary
-- authenticated users.  Owners retain access to their own work-in-progress.
drop policy if exists "tracks_public_read" on tracks;
create policy "tracks_approved_public_read" on tracks for select using (
  review_status = 'approved' and coalesce(fraud_suspended, false) = false
);
create policy "tracks_owner_read" on tracks for select using (
  auth.uid() = (select user_id from artists where id = artist_id)
);

-- r2_key is assigned by upload-url and must never be client editable.
create or replace function protect_tracks_server_fields()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if NEW.artist_id is distinct from OLD.artist_id
      or NEW.r2_key is distinct from OLD.r2_key
      or NEW.fingerprint is distinct from OLD.fingerprint
      or NEW.ai_generated is distinct from OLD.ai_generated
      or NEW.cumulative_plays is distinct from OLD.cumulative_plays
      or NEW.in_distribution is distinct from OLD.in_distribution
      or NEW.registration_fee_paid is distinct from OLD.registration_fee_paid
      or NEW.review_status is distinct from OLD.review_status
      or NEW.reviewed_at is distinct from OLD.reviewed_at then
      raise exception 'server-managed track fields cannot be changed directly';
    end if;
  end if;
  return NEW;
end;
$$;

-- A recipient may only mark an existing message as read; RLS alone cannot
-- restrict UPDATE to one column.
create or replace function protect_direct_message_recipient_updates()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if NEW.id is distinct from OLD.id
      or NEW.sender_id is distinct from OLD.sender_id
      or NEW.recipient_id is distinct from OLD.recipient_id
      or NEW.body is distinct from OLD.body
      or NEW.track_id is distinct from OLD.track_id
      or NEW.created_at is distinct from OLD.created_at then
      raise exception 'recipients may only update read_at';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_protect_direct_message_recipient_updates on direct_messages;
create trigger trg_protect_direct_message_recipient_updates
before update on direct_messages
for each row execute function protect_direct_message_recipient_updates();

drop policy if exists "direct_messages_recipient_update" on direct_messages;
create policy "direct_messages_recipient_update" on direct_messages for update
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

-- Student verification codes are secret.  Store only a hash, remove all direct
-- client table access, and consume a code under a row lock to make the attempt
-- limit atomic.
create extension if not exists pgcrypto;

alter table student_verifications add column if not exists code_hash text;
update student_verifications
set code_hash = encode(digest(code, 'sha256'), 'hex')
where code_hash is null;
alter table student_verifications alter column code_hash set not null;
alter table student_verifications drop column if exists code;

drop policy if exists "student_verifications_owner_read" on student_verifications;
drop policy if exists "student_verifications_owner_insert" on student_verifications;
drop policy if exists "student_verifications_owner_update" on student_verifications;

create or replace function consume_student_verification(p_code_hash text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  verification student_verifications%rowtype;
begin
  if auth.uid() is null then
    return 'unauthorized';
  end if;

  select * into verification
  from student_verifications
  where user_id = auth.uid() and verified = false
  order by created_at desc
  limit 1
  for update;

  if not found then
    return 'missing';
  end if;
  if verification.attempts >= 5 then
    return 'too_many_attempts';
  end if;
  if verification.expires_at <= now() then
    return 'expired';
  end if;
  if verification.code_hash <> p_code_hash then
    update student_verifications set attempts = attempts + 1 where id = verification.id;
    return 'invalid';
  end if;

  update student_verifications set verified = true where id = verification.id;
  perform set_config('reson.internal_student_verification', 'on', true);
  update users set student_verified = true where id = auth.uid();
  return 'verified';
end;
$$;

revoke all on function consume_student_verification(text) from public;
grant execute on function consume_student_verification(text) to authenticated;
