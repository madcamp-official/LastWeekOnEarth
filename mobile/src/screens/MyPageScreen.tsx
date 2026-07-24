import React from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useAuthStore } from "../store/useAuthStore";

export function MyPageScreen() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0] ?? "?"}</Text>
        </View>
        <Text style={styles.name}>{user?.name ?? "게스트"}</Text>
        <Text style={styles.email}>{user?.email ?? "-"}</Text>

        <Pressable style={styles.logoutButton} onPress={clear}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  name: { fontSize: 18, fontWeight: "700" },
  email: { color: "#888", marginTop: 4 },
  logoutButton: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: "#DADCE0",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  logoutText: { fontWeight: "600", color: "#B00020" },
});
