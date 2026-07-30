# Anchora
몰입캠프 26s-w4-c2-04 프로젝트 repository

**BLE 명함 교환 + 연락 빈도 리마인더 + AI 안부 메일 초안**을 갖춘 인맥 관리 앱입니다. 자세한 기획 의도·아키텍처·핵심 워크플로우는 [docs/PROJECT_INTRO.md](docs/PROJECT_INTRO.md)를 참고하세요.

## 구조

- `backend/` — Node.js + TypeScript + Express + Prisma (개발: SQLite, 배포: PostgreSQL 전환 가능)
- `mobile/` — React Native (Expo, Bare workflow) — 자세한 셋업은 [mobile/README.md](mobile/README.md)
- `docs/PROJECT_INTRO.md` — 프로젝트 소개 (기획 의도, 기능, 아키텍처)
- `docs/erd.md` — ERD (Prisma 스키마 시각화)
- `docs/openapi.yaml` — API 명세
- `docker-compose.yml`, `Caddyfile` — 배포용 (Caddy 리버스 프록시 + Let's Encrypt HTTPS)

## 주요 기능

- **BLE 명함 교환**: 주변 사용자를 블루투스로 태깅하면 실제 계정 정보로 인맥이 자동 등록됨
- **인맥 관리**: 등록/수정/삭제, 드래그로 순서 변경, 인맥당 여러 이메일
- **연락 빈도 그룹**: 그룹별 연락 주기 설정, 기준일 초과 시 리마인드
- **AI 안부 메일 초안**: Gemini API가 연락 이력 + CV 타임라인을 반영해 초안 생성, Gmail 연동으로 즉시/예약 발송
- **소식 피드**: 게시글·사진·좋아요·댓글
- **쪽지(DM)**: 실시간 1:1 메시지, 사진 편집 후 전송, 프로필/인맥 공유
- **실시간 알림**: Socket.IO 기반 즉시 반영 + Expo 푸시 알림

## 빠른 시작

### 1. 백엔드

```bash
cd backend
npm install
cp .env.example .env   # 값 채우기 (JWT 시크릿, GEMINI_API_KEY, GOOGLE_OAUTH_*, GMAIL_* 등)
npx prisma migrate dev
npm run dev             # http://localhost:4000
```

주요 환경 변수 (`backend/.env`):

```
DATABASE_URL=file:./dev.db
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
GEMINI_API_KEY=          # https://aistudio.google.com/apikey — AI 메일 초안 생성
GEMINI_MODEL=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=   # Gmail 발송 연동, https 필수
GMAIL_ALLOWED_TEST_EMAILS=   # 테스트 모드 Gmail 연동 허용 목록
GMAIL_USER=              # 회원가입 이메일 인증코드 발송용 계정
GMAIL_APP_PASSWORD=
GOOGLE_CLIENT_IDS=        # Google 로그인
```

유용한 스크립트:

```bash
npm run prisma:studio    # DB GUI로 확인
npm run seed              # 테스트 유저 시드 (alice/bob, 비밀번호 password123)
npm run dev:token -- <username>   # 로컬 테스트용 accessToken 즉시 발급
```

### 2. 모바일

[mobile/README.md](mobile/README.md) 참고. 요약:

```bash
cd mobile
npm install
cp .env.example .env    # EXPO_PUBLIC_API_BASE_URL 등 채우기
npx expo run:android    # 또는 npx expo run:ios (Xcode 필요)
```

BLE 네이티브 모듈(`react-native-ble-plx`, `react-native-ble-advertiser`) 때문에 Expo managed workflow가 아닌 **Bare workflow**로 동작하며, `ios/`·`android/` 네이티브 프로젝트가 저장소에 커밋되어 있습니다.

### 3. API 명세 확인

```bash
npx @redocly/cli preview-docs docs/openapi.yaml
```

### 4. 배포 (Docker Compose)

```bash
docker compose up -d --build
```

Caddy가 `Caddyfile`에 설정된 도메인으로 Let's Encrypt 인증서를 자동 발급하고 백엔드로 리버스 프록시합니다 (Gmail OAuth가 `https://` 리디렉션 URI를 요구하기 때문에 필요).

## 알려진 제약

- **iOS BLE 광고 미지원**: `react-native-ble-plx`는 스캔(Central) 전용이라 광고는 Android에서만 `react-native-ble-advertiser`로 처리합니다. iOS는 CoreBluetooth 플랫폼 제약으로 스캔만 지원하므로, 두 기기가 서로 태깅하려면 최소 한쪽은 Android여야 합니다.
- **iOS 푸시 알림**: 유료 Apple Developer Program 가입이 있어야 `aps-environment` 인타이틀먼트를 넣을 수 있어, 미가입 상태에서는 iOS 푸시가 비활성화됩니다. Android는 Firebase 프로젝트(FCM) 연동이 별도로 필요합니다.
- **AI 메일 초안**: 현재 Gemini API를 사용합니다(`backend/src/lib/gemini.ts`). Anthropic SDK 의존성이 남아있지만 미사용 스텁입니다.
