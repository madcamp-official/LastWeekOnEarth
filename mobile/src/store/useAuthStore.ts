import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthUser } from "../services/auth";
import { authSecureStorage } from "./secureStorage";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  setSession: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  clear: () => void;
  setHasHydrated: (value: boolean) => void;
}

// SecureStore(네이티브)/localStorage(웹)에 로그인 세션을 저장해 앱을 껐다 켜도 로그인 상태가 유지된다.
// accessToken이 만료돼도 refreshToken으로 api.ts의 axios 인터셉터가 자동으로 갱신한다.
// hasHydrated: 디스크에서 세션을 아직 읽어오는 중(비동기)인 짧은 순간에 로그인 화면이 잠깐 번쩍이는
// 것을 막기 위한 플래그 — App.tsx가 이 값이 true가 될 때까지 스플래시를 유지한다.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hasHydrated: false,
      setSession: (accessToken, refreshToken, user) => set({ accessToken, refreshToken, user }),
      updateUser: (patch) => set((state) => (state.user ? { user: { ...state.user, ...patch } } : state)),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "anchora-auth",
      storage: createJSONStorage(() => authSecureStorage),
      partialize: (state) => ({ accessToken: state.accessToken, refreshToken: state.refreshToken, user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
