import React from "react";
import { SafeAreaView, StyleSheet, Text } from "react-native";

// 기능별 화면은 src/screens 에 추가하고 여기서 네비게이션으로 연결한다.
export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>LastWeekOnEarth</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "600" },
});
