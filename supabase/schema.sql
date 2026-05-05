-- ============================================================
-- 인원배치도 현황판 - Supabase 스키마 (v2: zones, paths 추가)
-- ============================================================
-- 기존에 v1 스키마를 적용했다면, 추가된 테이블만 실행하거나
-- 전체를 다시 실행해도 IF NOT EXISTS로 안전합니다.
-- 단, maps 테이블에 calibration 컬럼이 없다면 ALTER TABLE이 필요합니다 (아래 참조).
-- ============================================================

-- 지도 테이블
create table if not exists public.maps (
  id uuid primary key,
  name text not null,
  image_data text not null,
  width integer not null,
  height integer not null,
  calibration jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 기존 maps 테이블에 calibration 컬럼이 없는 경우 추가
alter table public.maps add column if not exists calibration jsonb;

-- maps에 GPS 보정 컬럼 추가
alter table public.maps add column if not exists geo_calibration jsonb;

-- 마커 테이블
create table if not exists public.markers (
  id uuid primary key,
  map_id uuid not null references public.maps(id) on delete cascade,
  type_id text not null,
  x double precision not null,
  y double precision not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists markers_map_id_idx on public.markers(map_id);

-- 이동 애니메이션 동기화용 컬럼 (모바일 백그라운드에서도 끊김 없이 동작)
alter table public.markers add column if not exists moving_from_x double precision;
alter table public.markers add column if not exists moving_from_y double precision;
alter table public.markers add column if not exists moving_route jsonb;
alter table public.markers add column if not exists moving_started_at timestamptz;
alter table public.markers add column if not exists moving_duration_ms integer;

-- 마커 종류 테이블
create table if not exists public.marker_types (
  id text primary key,
  label text not null,
  color text not null,
  icon text
);

-- 마커 상태 테이블 (정상/주의/위험 등)
create table if not exists public.marker_statuses (
  id text primary key,
  label text not null,
  color text not null
);

-- 기존 markers 테이블에 status_id 컬럼이 없는 경우 추가
alter table public.markers add column if not exists status_id text;

-- 구역 테이블 (다각형)
create table if not exists public.zones (
  id uuid primary key,
  map_id uuid not null references public.maps(id) on delete cascade,
  name text not null,
  color text not null,
  points jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists zones_map_id_idx on public.zones(map_id);

-- 길 테이블 (폴리라인)
create table if not exists public.paths (
  id uuid primary key,
  map_id uuid not null references public.maps(id) on delete cascade,
  name text,
  color text not null,
  points jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists paths_map_id_idx on public.paths(map_id);

-- GPS 위치 테이블 (사용자당 1행, upsert)
create table if not exists public.gps_locations (
  user_id uuid primary key,
  user_name text not null,
  user_color text not null,
  lat double precision not null,
  lng double precision not null,
  accuracy_m double precision,
  map_id uuid,
  x double precision,
  y double precision,
  updated_at timestamptz not null default now()
);

create index if not exists gps_locations_map_id_idx on public.gps_locations(map_id);
create index if not exists gps_locations_updated_at_idx on public.gps_locations(updated_at);

-- 앱 전역 설정 (단일 행)
create table if not exists public.app_settings (
  id text primary key,
  gps_key text,
  updated_at timestamptz not null default now()
);

-- 기본 행 삽입 (id='global')
insert into public.app_settings (id, gps_key)
values ('global', '')
on conflict (id) do nothing;

-- ============================================================
-- 실시간 활성화 (이미 추가된 테이블이어도 에러 없이 실행되도록 DO 블록 사용)
-- ============================================================
do $$
declare
  tbl text;
begin
  for tbl in
    select unnest(array['maps', 'markers', 'marker_types', 'marker_statuses', 'zones', 'paths', 'gps_locations', 'app_settings'])
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;

-- ============================================================
-- RLS (인증 없이 동작) - 정책이 이미 있으면 drop 후 재생성
-- ============================================================
alter table public.maps enable row level security;
alter table public.markers enable row level security;
alter table public.marker_types enable row level security;
alter table public.marker_statuses enable row level security;
alter table public.zones enable row level security;
alter table public.paths enable row level security;
alter table public.gps_locations enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "anon all maps" on public.maps;
drop policy if exists "anon all markers" on public.markers;
drop policy if exists "anon all marker_types" on public.marker_types;
drop policy if exists "anon all marker_statuses" on public.marker_statuses;
drop policy if exists "anon all zones" on public.zones;
drop policy if exists "anon all paths" on public.paths;
drop policy if exists "anon all gps_locations" on public.gps_locations;
drop policy if exists "anon all app_settings" on public.app_settings;

create policy "anon all maps" on public.maps for all to anon using (true) with check (true);
create policy "anon all markers" on public.markers for all to anon using (true) with check (true);
create policy "anon all marker_types" on public.marker_types for all to anon using (true) with check (true);
create policy "anon all marker_statuses" on public.marker_statuses for all to anon using (true) with check (true);
create policy "anon all zones" on public.zones for all to anon using (true) with check (true);
create policy "anon all paths" on public.paths for all to anon using (true) with check (true);
create policy "anon all gps_locations" on public.gps_locations for all to anon using (true) with check (true);
create policy "anon all app_settings" on public.app_settings for all to anon using (true) with check (true);
