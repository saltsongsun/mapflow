# 인원배치도 현황판 (Personnel Board)

지도 위에 클릭/터치로 인원이나 상태를 표시하는 PWA. 다크모드, 자동 이미지 압축, 줌/팬, 마커 직접 커스터마이즈, Supabase 실시간 동기화. 인증 없이 동작.

## 기능

- 🗺️ **여러 지도 관리** — 상단 탭으로 빠르게 전환, 각 지도별 마커 독립 관리
- 📁 **자동 압축** — 큰 이미지도 자동 최적화 (최대 4096px, ~2.5MB)
- 📍 **빤짝이는 마커** — 클릭/터치 지점에 은은한 글로우 펄스 애니메이션
- 🔒 **보기/편집 모드 분리** — 평상시엔 잠금 상태로 안전하게 보기, 편집 모드에서만 마커 추가/이동/편집
- 🚶 **자연스러운 이동 모션** — 마커를 드래그하면 길 네트워크에서 **최단 경로(다익스트라)**를 찾아 자동으로 걸어가는 애니메이션
- 📏 **실제 거리 기반 속도** — 두 점의 실제 거리(미터)를 입력하면 시속 3km(보행) 속도로 정확하게 이동
- 🎯 **구역 도착 모드** — 구역에 도착할 때 정확한 클릭 지점 또는 구역 중심 정렬 중 선택 (도착 직후 토스트로 변경 가능)
- 🟦 **구역 그리기** — 다각형으로 구역 정의, 마커가 어느 구역에 있는지 자동 인식
- 🛣️ **길 그리기** — 폴리라인으로 통로 정의, 마커 이동 시 길을 따라가는 경로 자동 계산
- 🎨 **직접 커스텀 마커** — 이름과 색상을 자유롭게 정의 (같은 색에 다른 이름도 가능 — 같은 팀 내 여러 인원)
- 🌑 **다크모드 전용** — 깊은 다크 테마
- 🖥️ **전체화면 모드** — 한 번의 터치/클릭으로 전체화면 진입·종료
- 📲 **QR 공유 + 링크 복사** — 다른 기기에서 즉시 열기, 모바일에서는 OS 공유 메뉴 호출
- 📱 **PWA** — 설치 가능, 오프라인 지원
- ☁️ **Supabase 실시간 동기화** — 여러 기기에서 동시에 보고 편집
- 🔓 **로그인 불필요**

## 기술 스택

- **Next.js 14** (Pages Router) + **TypeScript**
- **Tailwind CSS** (다크모드)
- **Supabase** (Postgres + Realtime, 선택사항)
- **react-zoom-pan-pinch** (줌/팬)
- **browser-image-compression** (자동 압축)
- 배포: **GitHub → Vercel → Supabase**

## 로컬 실행

```bash
npm install
cp .env.local.example .env.local   # Supabase 사용 시 채우기, 안 채우면 로컬 모드
npm run dev
```

브라우저에서 http://localhost:3000

## 배포: GitHub → Vercel → Supabase

### 1단계 — Supabase 설정 (선택사항)

클라우드 동기화를 원하면 진행, 아니면 건너뛰고 바로 2단계로.

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor 탭 → New query → `supabase/schema.sql` 내용 붙여넣고 Run
3. Project Settings → API → URL과 anon public 키 복사

> **기존 사용자**: v1 스키마(maps, markers, marker_types만 있던 구조)를 사용 중이었다면, `supabase/schema.sql` 전체를 다시 실행하세요. `IF NOT EXISTS`와 `ALTER TABLE` 덕분에 기존 데이터를 보존하면서 zones/paths/calibration이 추가됩니다.

### 2단계 — GitHub 푸시

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/personnel-board.git
git push -u origin main
```

### 3단계 — Vercel 배포

1. [vercel.com](https://vercel.com)에서 New Project
2. GitHub 저장소 import
3. **Environment Variables**에 Supabase 정보 추가 (1단계 했을 경우):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

배포 후 발급된 URL로 접속하면 끝. 모바일에서 "홈 화면에 추가"하면 PWA로 설치됨.

## 사용법

1. 왼쪽 사이드바에서 **지도 업로드** — 자동 압축
2. 처음에는 **마커 종류 설정** 모달이 뜸 → 이름과 색상을 직접 지정
3. **편집 모드 켜기** — 좌측 상단의 자물쇠 아이콘(🔒 → ✏️)
4. 화면 하단 도구 모음에서 작업 선택:
   - **📍 마커** — 클릭한 지점에 마커 생성
   - **🟦 구역** — 여러 점을 클릭해 다각형 구역 정의 (예: A동, B동, 휴게실), 3점 이상 후 ✓ 클릭
   - **🛣️ 길** — 여러 점을 클릭해 통로/길 정의, 2점 이상 후 ✓ 클릭
   - **📏 거리** — 두 점을 찍고 그 사이의 실제 미터를 입력 → 보행 속도 보정
5. **마커 이동 (자동 경로)** — 편집 모드에서 마커를 길게 누르고 드래그하면, 길이 그려져 있을 경우 **자동으로 길을 따라 걸어가는 애니메이션**으로 이동합니다
6. **사용 흐름 예시**:
   1) 거리 보정으로 1미터=화면 몇 % 인지 설정
   2) 길을 따라 통로를 그림
   3) 마커를 시작점에 배치
   4) 드래그하면 시속 3km로 길을 따라 자연스럽게 이동

### 보기 모드 vs 편집 모드

- **보기 모드** 🔒 — 지도, 구역, 길, 마커를 자유롭게 보고 확대/축소만 가능
- **편집 모드** ✏️ — 모든 그리기/이동 작업 가능

### 줌/팬 단축키

- **마우스 휠** — 확대/축소
- **두 손가락 드래그** (모바일) — 팬
- **핀치** (모바일) — 확대/축소
- 우측 하단 버튼 — 확대/축소/원래 크기/중앙으로

## 데이터 저장

- 모든 데이터는 **Supabase에 저장**되어 여러 기기에서 실시간 공유됩니다
- 동시에 **로컬에도 캐시**되어 인터넷이 끊겨도 계속 사용 가능 (오프라인 PWA)
- Supabase 환경변수가 없으면 로컬 저장만 동작 (이 브라우저에만 보임)

## 보안 주의사항

이 앱은 **인증 없이** 동작합니다. URL을 아는 사람은 누구나 마커를 추가/수정/삭제할 수 있습니다. 외부에 공개되어선 안 되는 정보를 다룬다면, Supabase RLS 정책과 인증을 추가해야 합니다.

## 디렉토리 구조

```
src/
├── pages/          # Next.js 페이지 (index, _app, _document)
├── components/     # React 컴포넌트 (MapViewer, Sidebar, MarkerDot, MarkerTypeManager)
├── hooks/          # useAppData (Supabase + 로컬 통합)
├── lib/            # types, supabase 클라이언트, localStore, imageUtils
└── styles/         # globals.css (다크 테마, 마커 글로우)

public/
├── manifest.json   # PWA 매니페스트
├── sw.js           # 서비스 워커
└── icons/          # PWA 아이콘
```

## 라이선스

MIT
