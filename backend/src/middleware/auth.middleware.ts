import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt";

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; username: string };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization 헤더가 없습니다." });
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.userId, username: payload.username };
    return next();
  } catch {
    return res.status(401).json({ error: "유효하지 않거나 만료된 토큰입니다." });
  }
}
