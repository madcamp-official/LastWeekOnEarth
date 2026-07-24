import axios from "axios";
import Config from "react-native-config";
import { useAuthStore } from "../store/useAuthStore";

export const api = axios.create({
  baseURL: Config.API_BASE_URL ?? "http://localhost:4000/api",
});

api.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});
