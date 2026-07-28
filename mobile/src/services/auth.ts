import { api } from "./api";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  affiliation?: string;
  email: string;
  phone?: string | null;
  phoneVerified: boolean;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/google", { idToken });
  return data;
}

// 계정이 없으면 서버가 그 자리에서 자동으로 만들어준다. 신규 계정은 이름/소속이 비어있는 채로
// 오므로, 로그인 후 user.name이 비어있으면 프로필 완성 화면으로 보낸다 (App.tsx 참고).
// 처음 보는 이메일이면 서버가 428과 함께 requiresVerification:true를 돌려준다 — 그때
// sendEmailVerificationCode로 코드를 받아 code까지 같이 넣어서 다시 호출해야 가입이 완료된다.
export async function loginWithEmail(email: string, password: string, code?: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/email", { email, password, code });
  return data;
}

export async function sendEmailVerificationCode(email: string): Promise<void> {
  await api.post("/auth/email/send-code", { email });
}

// 서버에도 refreshToken을 폐기시켜 탈취된 토큰이 재사용되지 않게 한다. 실패해도 로그아웃 자체는
// 로컬 세션 삭제로 이어져야 하므로, 호출부에서 실패를 무시해도 안전하다.
export async function logout(refreshToken: string): Promise<void> {
  await api.post("/auth/logout", { refreshToken });
}
