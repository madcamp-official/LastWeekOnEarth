import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import LoginScreen from "./src/screens/LoginScreen";
import { useAuthStore } from "./src/store/useAuthStore";
import { RootNavigator } from "./src/navigation/RootNavigator";

function AppContent() {
  const user = useAuthStore((s) => s.user);
  return user ? <RootNavigator /> : <LoginScreen />;
}

export default function App() {
  if (Platform.OS !== "web") {
    return <AppContent />;
  }

  // 웹 프리뷰에서만 실제 폰 화면처럼 보이도록 고정 크기 프레임으로 감싼다.
  return (
    <View style={styles.webBackdrop}>
      <View style={styles.phoneFrame}>
        <AppContent />
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
