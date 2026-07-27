import { api } from "./api";
import type { AuthUser } from "./auth";

export interface ProfileUpdateInput {
  name?: string;
  affiliation?: string;
  phone?: string | null;
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
    api.patch<AuthUser>("/users/me", input).then((res) => res.data),

  deleteAccount: () => api.delete("/users/me"),

  listEmails: () => api.get<UserEmail[]>("/users/me/emails").then((res) => res.data),

  addEmail: (email: string) => api.post<UserEmail>("/users/me/emails", { email }).then((res) => res.data),

<<<<<<< HEAD
  setPrimaryEmail: (emailId: string) =>
    api.post<AuthUser>(`/users/me/emails/${emailId}/primary`).then((res) => res.data),

  removeEmail: (emailId: string) => api.delete(`/users/me/emails/${emailId}`),
=======
  setPrimaryEmail: (id: string) =>
    api.post<AuthUser>(`/users/me/emails/${id}/primary`).then((res) => res.data),

  removeEmail: (id: string) => api.delete(`/users/me/emails/${id}`),
>>>>>>> 4bbc0be066ea65cd4ed276105b73b545cb13a94b
};
