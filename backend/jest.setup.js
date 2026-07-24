// 테스트 실행 시 .env 없이도 env.ts 검증을 통과하도록 최소 기본값을 채운다.
process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/contactapp_test?schema=public";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
process.env.BLE_TOKEN_SECRET ??= "test-ble-secret";
