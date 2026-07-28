import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { StateStorage } from "zustand/middleware";

// SecureStore는 네이티브 전용(Keychain/Keystore)이라 웹 프리뷰에서는 없다 — 웹은 localStorage로 대체한다.
// SecureStore 값 하나당 2048바이트 제한이 있어 zustand persist 저장값(JSON 전체) 크기에 주의해야 하는데,
// AuthState에는 토큰/유저 기본정보만 담겨 그 안에 충분히 들어간다.
export const authSecureStorage: StateStorage = {
  getItem: async (name) => {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(name) ?? null;
    return (await SecureStore.getItemAsync(name)) ?? null;
  },
  setItem: async (name, value) => {
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(name, value);
      return;
    }
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name) => {
    if (Platform.OS === "web") {
      globalThis.localStorage?.removeItem(name);
      return;
    }
    await SecureStore.deleteItemAsync(name);
  },
};
