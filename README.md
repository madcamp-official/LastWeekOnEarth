# Anchora
몰입캠프 26s-w4-c2-04 프로젝트 repository

인맥관리 앱 (BLE 명함 교환 + 리멤버 스타일 관리)

## 구조

- `backend/` — Node.js + TypeScript + Express + Prisma (PostgreSQL)
- `mobile/` — React Native (Bare workflow) — 자세한 셋업은 [mobile/README.md](mobile/README.md)
- `docs/erd.md` — ERD (Prisma 스키마 시각화)
- `docs/openapi.yaml` — API 명세 (팀 공유용, 백엔드 라우트와 동기화)

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

[mobile/README.md](mobile/README.md) 참고 — 네이티브 프로젝트(iOS/Android) 생성이 먼저 필요.

### 3. API 명세 확인

```bash
npx @redocly/cli preview-docs docs/openapi.yaml
```

## 현재 상태

기반 세팅(DB 스키마, 인증 미들웨어, 모듈별 라우터 스텁) 완료. 각 엔드포인트는 `501 Not Implemented`를 반환하는 스텁이며, 기능별로 순서대로 구현합니다 (CLAUDE.md 섹션 6 참고).
