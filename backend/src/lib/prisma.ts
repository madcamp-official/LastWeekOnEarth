import { PrismaClient } from "@prisma/client";

// 개발 중 ts-node-dev 핫리로드로 커넥션이 중복 생성되는 것을 막기 위해 전역에 캐싱
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
