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

/**
 * BLE advertise용 5분 만료 단기 토큰. userId만 담아 상대 기기가 스캔 후
 * 서버에 제출하면 서버가 검증해 소유자를 특정한다 (CLAUDE.md 섹션 4).
 */
export function signBleToken(userId: string): string {
  return jwt.sign({ userId }, env.BLE_TOKEN_SECRET, {
    expiresIn: env.BLE_TOKEN_EXPIRES_IN,
  } as SignOptions);
}

export function verifyBleToken(token: string): { userId: string } {
  return jwt.verify(token, env.BLE_TOKEN_SECRET) as { userId: string; iat: number; exp: number };
}
