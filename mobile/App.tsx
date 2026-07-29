import React, { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import LoginScreen from "./src/screens/LoginScreen";
import ProfileSetupScreen from "./src/screens/ProfileSetupScreen";
import { useAuthStore } from "./src/store/useAuthStore";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { registerForPushNotifications } from "./src/services/pushNotifications";
import { connectSocket, disconnectSocket } from "./src/services/socket";
import { colors } from "./src/theme/colors";

function AppContent() {
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (user) {
      void registerForPushNotifications();
    }
  }, [user]);

  // 로그인 상태인 동안만 소켓을 열어둔다 — 쪽지/알림/소식이 폴링 없이 즉시 화면에 반영된다.
  useEffect(() => {
    if (!user) return;
    connectSocket();
    return () => disconnectSocket();
  }, [user]);

  // SecureStore/localStorage에서 저장된 세션을 비동기로 읽어오는 짧은 순간 — 로그인 화면이
  // 잠깐 번쩍이고 사라지는 것을 막기 위해 복원이 끝날 때까지 기다린다.
  if (!hasHydrated) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.violet} />
      </View>
    );
  }

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
        <KeyboardProvider>
          <AppContent />
        </KeyboardProvider>
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
  splash: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
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
