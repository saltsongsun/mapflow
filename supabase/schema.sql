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

-- ============================================================
-- 실시간 활성화
-- ============================================================
alter publication supabase_realtime add table public.maps;
alter publication supabase_realtime add table public.markers;
alter publication supabase_realtime add table public.marker_types;
alter publication supabase_realtime add table public.marker_statuses;
alter publication supabase_realtime add table public.zones;
alter publication supabase_realtime add table public.paths;

-- ============================================================
-- RLS (인증 없이 동작)
-- ============================================================
alter table public.maps enable row level security;
alter table public.markers enable row level security;
alter table public.marker_types enable row level security;
alter table public.marker_statuses enable row level security;
alter table public.zones enable row level security;
alter table public.paths enable row level security;

create policy "anon all maps" on public.maps for all to anon using (true) with check (true);
create policy "anon all markers" on public.markers for all to anon using (true) with check (true);
create policy "anon all marker_types" on public.marker_types for all to anon using (true) with check (true);
create policy "anon all marker_statuses" on public.marker_statuses for all to anon using (true) with check (true);
create policy "anon all zones" on public.zones for all to anon using (true) with check (true);
create policy "anon all paths" on public.paths for all to anon using (true) with check (true);
