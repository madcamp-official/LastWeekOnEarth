// TEMP(로컬 테스트용): react-native-config의 안드로이드 네이티브 빌드 값 주입이 이 Expo prebuild
// 환경에서 확인이 안 돼서(생성된 빌드 산출물 어디에도 값이 안 보임), 검증된 EXPO_PUBLIC_* 인라인
// 방식으로 모든 플랫폼을 통일해뒀다. 원래 코드(NativeConfig 분기)는 팀원과 상의 후 복원할 것.
const Config = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
};

export default Config;
