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

export async function loginWithPassword(username: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", { username, password });
  return data;
}

// 계정이 없으면 서버가 그 자리에서 자동으로 만들어준다. 신규 계정은 이름/소속이 비어있는 채로
// 오므로, 로그인 후 user.name이 비어있으면 프로필 완성 화면으로 보낸다 (App.tsx 참고).
export async function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/email", { email, password });
  return data;
}
