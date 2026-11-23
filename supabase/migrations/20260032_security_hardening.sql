-- Security hardening for server-managed fields and money/score-bearing events.
-- Client sessions must not be able to bypass API validation by writing directly to Supabase.

-- 1) Block direct client INSERTs for events that affect ranking, billing, payouts, or fraud checks.
drop policy if exists "play_events_user_insert" on play_events;
drop policy if exists "supports_user_insert" on supports;
drop policy if exists "boost_hearts_user_insert" on boost_hearts;
drop policy if exists "payout_requests_owner_insert" on payout_requests;

-- Reads remain governed by the existing SELECT policies. Trusted server routes use service_role.

-- 2) Protect server-managed user fields even though users_self_update allows users to edit their own row.
create or replace function protect_users_server_fields()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
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

drop trigger if exists trg_protect_users_server_fields on users;
create trigger trg_protect_users_server_fields
before update on users
for each row execute function protect_users_server_fields();

-- 3) Prevent artists from self-approving or granting themselves platform badges.
create or replace function protect_artists_server_fields()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if NEW.user_id is distinct from OLD.user_id
      or NEW.verified_badge is distinct from OLD.verified_badge
      or NEW.founding_artist is distinct from OLD.founding_artist
      or NEW.review_status is distinct from OLD.review_status
      or NEW.reviewed_at is distinct from OLD.reviewed_at then
      raise exception 'server-managed artist fields cannot be changed directly';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_protect_artists_server_fields on artists;
create trigger trg_protect_artists_server_fields
before update on artists
for each row execute function protect_artists_server_fields();

-- 4) Prevent track owners from changing counters/payment/review fields that feed distribution.
create or replace function protect_tracks_server_fields()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if NEW.artist_id is distinct from OLD.artist_id
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

drop trigger if exists trg_protect_tracks_server_fields on tracks;
create trigger trg_protect_tracks_server_fields
before update on tracks
for each row execute function protect_tracks_server_fields();

-- 5) Webhook idempotency must be enforced by the database, not only SELECT-before-INSERT.
create unique index if not exists supports_payment_id_unique
  on supports(payment_id)
  where payment_id is not null;

create unique index if not exists boost_hearts_payment_id_unique
  on boost_hearts(payment_id)
  where payment_id is not null;

-- 6) At most one pending payout request per artist. This also closes request races.
create unique index if not exists payout_requests_one_pending_per_artist
  on payout_requests(artist_id)
  where status = 'pending';
