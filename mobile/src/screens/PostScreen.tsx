import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export function PostScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>글쓰기</Text>
        <Text style={styles.subtitle}>준비 중인 기능입니다.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { color: "#888", marginTop: 8 },
});
