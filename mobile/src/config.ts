import { Platform } from "react-native";

// react-native-config는 네이티브 빌드 시점에 .env를 주입하는 방식이라 웹 번들에서는 동작하지 않는다.
// 웹에서는 process.env(Webpack DefinePlugin/Expo env)로 대체한다.
const NativeConfig = Platform.OS === "web" ? null : require("react-native-config").default;

const Config = NativeConfig ?? {
  API_BASE_URL: process.env.API_BASE_URL,
  GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID: process.env.GOOGLE_IOS_CLIENT_ID,
};

export default Config;
