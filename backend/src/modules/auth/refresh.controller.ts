import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { verifyRefreshToken } from "../../lib/jwt";
import { issueTokens } from "../../lib/issueTokens";

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

/**
 * 모바일 앱이 로그인 상태를 유지하기 위해 쓰는 엔드포인트. accessToken(1h)이 만료되면
 * 저장해둔 refreshToken(14d)으로 새 토큰 쌍을 발급받는다. 회전(rotate) 방식: 기존
 * refreshToken은 즉시 폐기하고 새 refreshToken을 내려준다 — 탈취된 토큰의 재사용을 막기 위함.
 */
export async function refreshHandler(req: Request, res: Response) {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "refreshToken이 필요합니다." });
  }
  const { refreshToken } = parsed.data;

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ error: "유효하지 않거나 만료된 refreshToken입니다." });
  }

  const storedTokens = await prisma.refreshToken.findMany({
    where: { userId: payload.userId, revoked: false, expiresAt: { gt: new Date() } },
  });

  let matched: (typeof storedTokens)[number] | undefined;
  for (const stored of storedTokens) {
    if (await bcrypt.compare(refreshToken, stored.tokenHash)) {
      matched = stored;
      break;
    }
  }
  if (!matched) {
    return res.status(401).json({ error: "유효하지 않거나 만료된 refreshToken입니다." });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return res.status(401).json({ error: "사용자를 찾을 수 없습니다." });
  }

  await prisma.refreshToken.update({ where: { id: matched.id }, data: { revoked: true } });
  const { accessToken, refreshToken: newRefreshToken } = await issueTokens(user);

  return res.status(200).json({ accessToken, refreshToken: newRefreshToken });
}

export async function logoutHandler(req: Request, res: Response) {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(204).send();
  }
  const { refreshToken } = parsed.data;

  try {
    const payload = verifyRefreshToken(refreshToken);
    const storedTokens = await prisma.refreshToken.findMany({
      where: { userId: payload.userId, revoked: false },
    });
    for (const stored of storedTokens) {
      if (await bcrypt.compare(refreshToken, stored.tokenHash)) {
        await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
        break;
      }
    }
  } catch {
    // 이미 만료/무효한 토큰이면 조용히 무시 — 로그아웃은 어차피 클라이언트 쪽에서 토큰을 지운다.
  }

  return res.status(204).send();
}
