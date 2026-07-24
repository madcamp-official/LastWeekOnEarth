import { api } from "./api";
import type { AuthUser } from "./auth";

export interface ProfileUpdateInput {
  name?: string;
  affiliation?: string;
  phone?: string | null;
}

export const usersApi = {
  me: () => api.get<AuthUser>("/users/me").then((res) => res.data),

  updateAvatar: (avatarUrl: string | null) =>
    api.patch<AuthUser>("/users/me", { avatarUrl }).then((res) => res.data),

  updateProfile: (input: ProfileUpdateInput) =>
    api.patch<AuthUser>("/users/me", input).then((res) => res.data),
};
