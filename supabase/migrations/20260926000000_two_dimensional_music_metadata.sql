-- 二次元コンテンツと音楽クレジットのメタデータ
--
-- recording_type は「オリジナル／カバー／リミックス」など、
-- content_category はアニメ・ゲーム・VTuber等の紐付く文脈を表す。
-- タイトルに feat. や原曲情報を埋め込まず、検索・表示・審査で再利用できる形にする。

alter table tracks
  add column recording_type text not null default 'original'
    check (recording_type in ('original', 'cover', 'remix', 'arrangement', 'medley', 'live', 'instrumental')),
  add column content_category text not null default 'none'
    check (content_category in ('none', 'anime', 'game', 'visual_novel', 'vtuber', 'virtual_character', 'voice_synth', 'other')),
  add column source_track_id uuid references tracks(id) on delete set null,
  add column source_title text,
  add column source_artist_name text,
  add column source_work_title text,
  add column source_url text,
  add column rights_status text not null default 'original'
    check (rights_status in ('original', 'permission_obtained', 'public_domain')),
  add column rights_confirmed bool not null default false,
  add column rights_confirmed_at timestamptz,
  add column rights_note text;

create index idx_tracks_recording_type on tracks(recording_type);
create index idx_tracks_content_category on tracks(content_category);
create index idx_tracks_source_track on tracks(source_track_id);

-- 楽曲ごとの参加者・制作スタッフ。display_nameはリリース時点の表記を保持し、
-- artist_idがある場合はRESON上のプロフィールにも紐付ける。
create table track_credits (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references tracks(id) on delete cascade,
  artist_id uuid references artists(id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 100),
  role text not null check (role in (
    'featured_artist', 'vocalist', 'composer', 'lyricist', 'arranger',
    'producer', 'remixer', 'illustrator', 'character', 'voice_actor', 'original_artist'
  )),
  display_order int not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now()
);

create index idx_track_credits_track_order on track_credits(track_id, display_order);
create index idx_track_credits_artist on track_credits(artist_id);

alter table track_credits enable row level security;

grant select on track_credits to anon, authenticated;
grant insert, update, delete on track_credits to authenticated;
grant all on track_credits to service_role;

create policy "track_credits_public_or_owner_read"
  on track_credits for select
  to anon, authenticated
  using (
    exists (
      select 1
      from tracks t
      where t.id = track_credits.track_id
        and (
          (t.review_status = 'approved' and coalesce(t.fraud_suspended, false) = false)
          or auth.uid() = (select a.user_id from artists a where a.id = t.artist_id)
        )
    )
  );

create policy "track_credits_owner_insert"
  on track_credits for insert
  to authenticated
  with check (
    auth.uid() = (
      select a.user_id
      from tracks t
      join artists a on a.id = t.artist_id
      where t.id = track_credits.track_id
    )
  );

create policy "track_credits_owner_update"
  on track_credits for update
  to authenticated
  using (
    auth.uid() = (
      select a.user_id
      from tracks t
      join artists a on a.id = t.artist_id
      where t.id = track_credits.track_id
    )
  )
  with check (
    auth.uid() = (
      select a.user_id
      from tracks t
      join artists a on a.id = t.artist_id
      where t.id = track_credits.track_id
    )
  );

create policy "track_credits_owner_delete"
  on track_credits for delete
  to authenticated
  using (
    auth.uid() = (
      select a.user_id
      from tracks t
      join artists a on a.id = t.artist_id
      where t.id = track_credits.track_id
    )
  );
