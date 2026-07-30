import axios from "axios";
import Config from "../config";
import { useAuthStore } from "../store/useAuthStore";

export const api = axios.create({
  baseURL: Config.API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// accessToken(1h)이 만료되면 401이 오는데, 로그인 상태를 유지하려면 여기서 refreshToken으로
// 자동 갱신하고 원래 요청을 한 번 재시도해야 사용자가 다시 로그인하지 않아도 된다.
// 동시에 여러 요청이 401을 받아도 refresh 호출은 한 번만 하도록 진행 중인 Promise를 공유한다.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${Config.API_BASE_URL}/auth/refresh`,
      { refreshToken },
    );
    const user = useAuthStore.getState().user;
    if (user) {
      useAuthStore.getState().setSession(data.accessToken, data.refreshToken, user);
    }
    return data.accessToken;
  } catch {
    useAuthStore.getState().clear();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes("/auth/");

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      refreshPromise = refreshPromise ?? refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newAccessToken = await refreshPromise;

      if (newAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);
