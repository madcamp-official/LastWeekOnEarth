import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface AccessTokenPayload {
  userId: string;
  username: string;
}

export interface RefreshTokenPayload {
  userId: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload & { iat: number; exp: number };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload & { iat: number; exp: number };
}

export interface GmailOAuthStatePayload {
  userId: string;
}

// Google 동의 화면 redirect의 state 파라미터 서명/검증용 (5분 내 콜백 와야 함, CSRF 겸용).
export function signGmailOAuthState(payload: GmailOAuthStatePayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: "5m" });
}

export function verifyGmailOAuthState(state: string): GmailOAuthStatePayload {
  return jwt.verify(state, env.JWT_ACCESS_SECRET) as GmailOAuthStatePayload & { iat: number; exp: number };
}
