# LastWeekOnEarth
몰입캠프 26s-w4-c2-04 프로젝트 repository

인맥관리 앱 (BLE 명함 교환 + 리멤버 스타일 관리)

## 구조

- `backend/` — Node.js + TypeScript + Express + Prisma (PostgreSQL)
- `mobile/` — React Native (Bare workflow, 네이티브 `ios/`/`android/` 프로젝트 포함) — 자세한 셋업은 [mobile/README.md](mobile/README.md)
- `docs/erd.md` — ERD (Prisma 스키마 시각화)
- `docs/openapi.yaml` — API 명세 (팀 공유용, 백엔드 라우트와 동기화)
- `docs/testing-guide.md` — 주소록/BLE 기능을 로그인 기능 없이 로컬에서 바로 테스트하는 순서

## 빠른 시작

### 1. DB + 백엔드 (Docker)

```bash
cp backend/.env.example backend/.env   # 값 채우기 (JWT 시크릿 등)
docker compose up -d postgres          # Postgres만 먼저 띄우기
cd backend
npm install
npx prisma migrate dev --name init
npm run dev                            # http://localhost:4000
```

또는 백엔드까지 컨테이너로: `docker compose up -d --build` (Adminer는 http://localhost:8080 에서 DB 확인 가능, 서버 `postgres` / 계정 `postgres`/`postgres`).

### 2. 모바일

```bash
cd mobile && npm install
cd ios && bundle install && bundle exec pod install && cd ..   # iOS만
npm run ios     # 또는 npm run android
```

자세한 내용(BLE 아키텍처, 실기기 IP 설정 등)은 [mobile/README.md](mobile/README.md) 참고.

### 3. 로그인 기능 없이 주소록/BLE 기능 바로 테스트하기

[docs/testing-guide.md](docs/testing-guide.md) — accessToken 임시 발급부터 두 기기 간 BLE 태깅까지 순서대로 정리.

### 4. API 명세 확인

```bash
npx @redocly/cli preview-docs docs/openapi.yaml
```

## 현재 상태

- **완료**: DB 스키마, 인증 미들웨어, 주소록(수동 등록/조회/수정/삭제, 연락 로그, BLE 태깅) API — 실제 DB로 테스트 검증됨. 모바일 화면(목록/등록/상세/BLE 태깅) + 네이티브 프로젝트 생성 완료, 타입체크 통과 (실기기 빌드는 Xcode/Android Studio 있는 로컬에서 확인 필요).
- **스텁**: 회원가입/로그인/OTP, 그룹, CV, AI 메일, 알림 — `501 Not Implemented`, 기능별로 순서대로 구현 (CLAUDE.md 섹션 6 참고).
- **알려진 제약**: iOS는 BLE 광고 미지원(스캔만 가능) — 자세한 이유는 `mobile/README.md` 참고.
