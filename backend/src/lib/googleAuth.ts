import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";

const client = new OAuth2Client();

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

/**
 * 모바일(iOS/Android) 클라이언트 ID로 발급된 idToken도 함께 검증되도록
 * audience에 웹/iOS/Android 클라이언트 ID를 모두 등록해 사용한다.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_IDS,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Google idToken payload가 유효하지 않습니다.");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email.split("@")[0],
    emailVerified: payload.email_verified ?? false,
  };
}
