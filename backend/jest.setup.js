const path = require("path");
const dotenv = require("dotenv");

// contacts 통합 테스트는 실제 Prisma/Postgres에 접근하므로, backend/.env가 있으면 그 DATABASE_URL을 사용한다
// (즉 dev DB에 대해 실행됨 — 테스트는 자신이 만든 데이터를 afterAll에서 정리한다).
// .env가 없는 환경(예: CI)에서는 아래 기본값으로 폴백한다.
dotenv.config({ path: path.resolve(__dirname, ".env") });

process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/contactapp_test?schema=public";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
