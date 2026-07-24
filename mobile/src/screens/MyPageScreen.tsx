import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../store/useAuthStore";
import { usersApi } from "../services/usersApi";

export function MyPageScreen() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const clear = useAuthStore((s) => s.clear);
  const [uploading, setUploading] = useState(false);

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("사진 접근 권한이 필요합니다.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    const dataUrl = `data:image/jpeg;base64,${result.assets[0].base64}`;
    setUploading(true);
    try {
      const updated = await usersApi.updateAvatar(dataUrl);
      updateUser({ avatarUrl: updated.avatarUrl });
    } catch (err) {
      Alert.alert("업로드 실패", "프로필 사진을 저장하지 못했습니다.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Pressable style={styles.avatar} onPress={handlePickPhoto} disabled={uploading}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{user?.name?.[0] ?? "?"}</Text>
          )}
          <View style={styles.avatarBadge}>
            {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.avatarBadgeText}>+</Text>}
          </View>
        </Pressable>
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
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    overflow: "visible",
  },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "700" },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarBadgeText: { color: "#fff", fontWeight: "700", fontSize: 16, lineHeight: 18 },
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
