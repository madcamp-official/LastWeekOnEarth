import { api } from "./api";
import type { AuthUser } from "./auth";

export interface ProfileUpdateInput {
  name?: string;
  affiliation?: string;
  phone?: string | null;
}

// 전화번호가 이미 다른 계정에 등록돼 있으면 서버가 두 계정을 하나로 합치고, 현재 세션은
// 무효화되므로 새 토큰을 같이 내려준다 (mergeAccountByPhone.ts 참고).
export interface ProfileUpdateResponse extends AuthUser {
  merged?: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
}

export interface UserEmail {
  id: string;
  userId: string;
  email: string;
  isPrimary: boolean;
  createdAt: string;
}

export const usersApi = {
  me: () => api.get<AuthUser>("/users/me").then((res) => res.data),

  updateAvatar: (avatarUrl: string | null) =>
    api.patch<AuthUser>("/users/me", { avatarUrl }).then((res) => res.data),

  updateProfile: (input: ProfileUpdateInput) =>
    api.patch<ProfileUpdateResponse>("/users/me", input).then((res) => res.data),

  deleteAccount: () => api.delete("/users/me"),

  listEmails: () => api.get<UserEmail[]>("/users/me/emails").then((res) => res.data),

  addEmail: (email: string) => api.post<UserEmail>("/users/me/emails", { email }).then((res) => res.data),

  setPrimaryEmail: (emailId: string) =>
    api.post<AuthUser>(`/users/me/emails/${emailId}/primary`).then((res) => res.data),

  removeEmail: (emailId: string) => api.delete(`/users/me/emails/${emailId}`),
};
