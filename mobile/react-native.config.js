module.exports = {
  dependencies: {
    // iOS 전용 BLE 광고 모듈 (bleService.ts에서 Platform.OS === "ios"일 때만 require).
    // 패키지의 android/build.gradle이 구식 Gradle DSL(compile, com.android.support)을 써서
    // 최신 AGP에서 컴파일이 깨진다 — 실제로 Android에서 안 쓰이므로 오토링킹에서 제외한다.
    "react-native-ble-peripheral": {
      platforms: {
        android: null,
      },
    },
  },
};
