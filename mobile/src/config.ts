import { Platform } from "react-native";

// react-native-config는 네이티브 빌드 시점에 .env를 주입하는 방식이라 웹 번들에서는 동작하지 않는다.
// 웹에서는 Expo가 빌드 시점에 인라인해주는 EXPO_PUBLIC_* 환경변수로 대체한다.
// (일반 process.env.FOO는 클라이언트 번들에 값이 안 들어가고 undefined로 남는다 — EXPO_PUBLIC_ 접두사 필수.)
const NativeConfig = Platform.OS === "web" ? null : require("react-native-config").default;

const Config = NativeConfig ?? {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
};

export default Config;
