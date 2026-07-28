import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";
import { prisma } from "./prisma";

const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.send", "openid", "email"];

function assertConfigured() {
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET || !env.GOOGLE_OAUTH_REDIRECT_URI) {
    throw new Error("Gmail OAuth 환경변수(GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI)가 설정되지 않았습니다.");
  }
}

function createOAuthClient(): OAuth2Client {
  assertConfigured();
  return new OAuth2Client(env.GOOGLE_OAUTH_CLIENT_ID, env.GOOGLE_OAUTH_CLIENT_SECRET, env.GOOGLE_OAUTH_REDIRECT_URI);
}

// 테스트 모드: 허용 목록에 있는 이메일만 Gmail 발송 권한 연동 가능.
export function isEmailAllowedForGmailTest(email: string): boolean {
  return env.GMAIL_ALLOWED_TEST_EMAILS.includes(email.trim().toLowerCase());
}

/**
 * state에는 이 요청을 시작한 user의 id를 담아, 콜백(비로그인 리다이렉트)에서 누구 것인지 식별한다.
 * CSRF 방지를 위해 state는 auth.middleware와 별개로 짧게 산다고 가정하고 호출부에서 JWT로 서명해 넘긴다.
 */
export function buildGmailConsentUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: GMAIL_SCOPES,
    prompt: "consent",
    state,
  });
}

export async function exchangeGmailAuthCode(code: string): Promise<{
  refreshToken: string;
  grantedEmail: string;
  scope: string;
}> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google이 refresh_token을 내려주지 않았습니다. (이미 동의한 계정이면 access_type=offline+prompt=consent로 재동의 필요)");
  }
  if (!tokens.id_token) {
    throw new Error("Google 응답에 id_token이 없습니다.");
  }

  client.setCredentials(tokens);
  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_OAUTH_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error("Google id_token에 email이 없습니다.");
  }

  return {
    refreshToken: tokens.refresh_token,
    grantedEmail: payload.email,
    scope: tokens.scope ?? GMAIL_SCOPES.join(" "),
  };
}

async function getAccessTokenForUser(userId: string): Promise<{ accessToken: string; fromEmail: string }> {
  const authorization = await prisma.gmailAuthorization.findUnique({ where: { userId } });
  if (!authorization) {
    throw new Error("Gmail 발송 권한이 연동되어 있지 않습니다.");
  }

  const client = createOAuthClient();
  client.setCredentials({ refresh_token: authorization.refreshToken });
  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error("Gmail access token 갱신에 실패했습니다.");
  }

  return { accessToken: credentials.access_token, fromEmail: authorization.grantedEmail };
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encodeHeaderValue(value: string): string {
  // 제목/이름에 한글 등 비-ASCII가 들어갈 수 있어 RFC 2047로 인코딩한다.
  return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

interface SendGmailInput {
  to: string;
  subject: string;
  body: string;
}

export async function sendGmailOnBehalfOfUser(userId: string, input: SendGmailInput): Promise<{ messageId: string }> {
  const { accessToken, fromEmail } = await getAccessTokenForUser(userId);

  const rawMessage = [
    `From: ${fromEmail}`,
    `To: ${input.to}`,
    `Subject: ${encodeHeaderValue(input.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(input.body, "utf-8").toString("base64"),
  ].join("\r\n");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: base64UrlEncode(rawMessage) }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gmail 발송 실패 (${response.status}): ${errorBody}`);
  }

  const result = (await response.json()) as { id: string };
  return { messageId: result.id };
}
