import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import LoginScreen from "./src/screens/LoginScreen";
import ProfileSetupScreen from "./src/screens/ProfileSetupScreen";
import { useAuthStore } from "./src/store/useAuthStore";
import { RootNavigator } from "./src/navigation/RootNavigator";

function AppContent() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <LoginScreen />;
  // 방금 자동 가입된 계정(이메일이든 Google이든)은 소속/전화번호가 비어있다 — Google은 이름을
  // 자동으로 채워주므로 이름 유무로는 신규 가입을 구분할 수 없어 소속/전화번호 기준으로 판단한다.
  if (!user.affiliation || !user.phone) return <ProfileSetupScreen />;
  return <RootNavigator />;
}

export default function App() {
  if (Platform.OS !== "web") {
    return (
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    );
  }

  // 웹 프리뷰에서만 실제 폰 화면처럼 보이도록 고정 크기 프레임으로 감싼다.
  return (
    <View style={styles.webBackdrop}>
      <View style={styles.phoneFrame}>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webBackdrop: {
    flex: 1,
    minHeight: "100vh" as unknown as number,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e5e5e5",
  },
  phoneFrame: {
    width: 390,
    height: 844,
    maxHeight: "95vh" as unknown as number,
    overflow: "hidden",
    borderRadius: 40,
    borderWidth: 10,
    borderColor: "#1a1a1a",
    backgroundColor: "#fff",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
  } as any,
});
