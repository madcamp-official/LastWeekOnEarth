// 환경변수가 없는 기기에서도 로컬 서버가 아니라 공용 VM 백엔드에 연결한다.
// 로컬 백엔드가 필요할 때만 EXPO_PUBLIC_API_BASE_URL로 명시적으로 덮어쓴다.
const DEFAULT_API_BASE_URL = "https://surrounding-opened-leonard-lauderdale.trycloudflare.com/api";

const Config = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
};

export default Config;
