# 인원배치도 현황판 (Personnel Board)

지도 위에 클릭/터치로 인원이나 상태를 표시하는 PWA. 다크모드, 자동 이미지 압축, 줌/팬, 마커 직접 커스터마이즈, Supabase 실시간 동기화. 인증 없이 동작.

## 기능

- 🗺️ **여러 지도 관리** — 상단 탭으로 빠르게 전환, 각 지도별 마커 독립 관리
- 📁 **자동 압축** — 큰 이미지도 자동 최적화 (최대 4096px, ~2.5MB)
- 📍 **빤짝이는 마커** — 클릭/터치 지점에 은은한 글로우 펄스 애니메이션
- 🔍 **확대/축소** — 마우스 휠, 핀치 줌, 버튼 컨트롤 (최대 8배)
- 🎨 **직접 커스텀 마커** — 이름과 색상을 자유롭게 정의 (인원명, 팀명, 상태 등)
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
2. 처음에는 **마커 종류 설정** 모달이 뜸 → 이름과 색상을 직접 지정 (예: "김OO" + 보라, "팀A" + 파랑)
3. 사이드바 또는 모바일 헤더의 레이어 아이콘에서 사용할 종류 선택
4. 지도의 원하는 지점을 클릭/터치 → 빤짝이는 마커 생성
5. 마커를 다시 클릭하면 종류/메모 변경 또는 삭제
6. **여러 지도 전환** — 상단 탭이나 사이드바 목록에서 지도 선택
7. 설정 아이콘(⚙️)으로 마커 종류 언제든 추가/편집

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
