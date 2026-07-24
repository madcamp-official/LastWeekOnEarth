import bcrypt from "bcrypt";
import { prisma } from "./prisma";
import { signAccessToken, signRefreshToken } from "./jwt";
import { env } from "../config/env";

function parseExpiresInMs(expiresIn: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 14 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]]!;
  return value * unitMs;
}

/**
 * access/refresh 토큰 발급 + refreshToken 해시를 DB에 저장 (로그아웃 시 개별 무효화용).
 */
export async function issueTokens(user: { id: string; username: string }) {
  const accessToken = signAccessToken({ userId: user.id, username: user.username });
  const refreshToken = signRefreshToken({ userId: user.id });

  const tokenHash = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + parseExpiresInMs(env.JWT_REFRESH_EXPIRES_IN));

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  return { accessToken, refreshToken };
}
