import React from "react";
import { SafeAreaView, StyleSheet, Text } from "react-native";
import LoginScreen from "./src/screens/LoginScreen";
import { useAuthStore } from "./src/store/useAuthStore";

// 기능별 화면은 src/screens 에 추가하고 여기서 네비게이션으로 연결한다.
export default function App() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>안녕하세요, {user.name}님</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "600" },
});
