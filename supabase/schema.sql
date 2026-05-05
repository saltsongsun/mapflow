-- ============================================================
-- 인원배치도 현황판 - Supabase 스키마
-- ============================================================
-- Supabase 프로젝트의 SQL Editor에서 실행하세요.
-- ============================================================

-- 지도 테이블
create table if not exists public.maps (
  id uuid primary key,
  name text not null,
  image_data text not null,
  width integer not null,
  height integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- 마커 종류 테이블 (커스텀 가능)
create table if not exists public.marker_types (
  id text primary key,
  label text not null,
  color text not null,
  icon text
);

-- ============================================================
-- 실시간 활성화
-- ============================================================
alter publication supabase_realtime add table public.maps;
alter publication supabase_realtime add table public.markers;
alter publication supabase_realtime add table public.marker_types;

-- ============================================================
-- RLS 정책 (인증 없이 누구나 읽기/쓰기 가능 - 비공개 사용 전제)
-- ============================================================
-- 주의: 인증 없는 모드입니다. 외부에 URL이 노출되면 누구나 수정 가능하니
-- 실제 운영 시에는 Supabase RLS와 인증을 추가하는 것을 권장합니다.

alter table public.maps enable row level security;
alter table public.markers enable row level security;
alter table public.marker_types enable row level security;

create policy "anon all maps" on public.maps for all to anon using (true) with check (true);
create policy "anon all markers" on public.markers for all to anon using (true) with check (true);
create policy "anon all marker_types" on public.marker_types for all to anon using (true) with check (true);
