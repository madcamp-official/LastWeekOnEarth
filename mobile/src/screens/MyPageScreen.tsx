import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../store/useAuthStore";
import { usersApi, type UserEmail } from "../services/usersApi";
import { PhoneNumberInput } from "../components/PhoneNumberInput";
import { EmailListEditor } from "../components/EmailListEditor";

const PHONE_REGEX = /^\d{2,3}-\d{3,4}-\d{4}$/;

// react-native-google-signin은 네이티브 전용 모듈이라 웹 프리뷰에서는 로드하지 않는다 (LoginScreen과 동일).
const GoogleSigninModule = Platform.OS === "web" ? null : require("@react-native-google-signin/google-signin");
const GoogleSignin = GoogleSigninModule?.GoogleSignin;

export function MyPageScreen() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const clear = useAuthStore((s) => s.clear);

  const signOutOfGoogle = async () => {
    try {
      await GoogleSignin?.signOut();
    } catch {
      // 구글 세션이 없었던 경우 등은 무시한다.
    }
  };

  const handleLogout = async () => {
    await signOutOfGoogle();
    clear();
  };

  const handleDeleteAccount = () => {
    Alert.alert("정말 탈퇴하시겠어요?", "내 주소록, 그룹 등 모든 데이터가 삭제되고 되돌릴 수 없습니다.", [
      { text: "취소", style: "cancel" },
      {
        text: "탈퇴",
        style: "destructive",
        onPress: async () => {
          try {
            await usersApi.deleteAccount();
            await signOutOfGoogle();
            clear();
          } catch (err) {
            const message =
              axios.isAxiosError(err) && err.response?.data?.error
                ? err.response.data.error
                : "탈퇴 처리 중 오류가 발생했습니다.";
            Alert.alert("탈퇴 실패", message);
          }
        },
      },
    ]);
  };
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [affiliation, setAffiliation] = useState(user?.affiliation ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [emails, setEmails] = useState<UserEmail[]>([]);

  const loadEmails = useCallback(async () => {
    setEmails(await usersApi.listEmails());
  }, []);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

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

  const handleStartEdit = () => {
    setName(user?.name ?? "");
    setAffiliation(user?.affiliation ?? "");
    setPhone(user?.phone ?? "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("이름을 입력해주세요.");
      return;
    }
    if (phone.trim() && !PHONE_REGEX.test(phone.trim())) {
      Alert.alert("전화번호를 빈칸 없이 모두 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const updated = await usersApi.updateProfile({
        name: name.trim(),
        affiliation: affiliation.trim(),
        phone: phone.trim() || null,
      });
      updateUser(updated);
      setEditing(false);
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "정보를 저장하지 못했습니다.";
      Alert.alert("저장 실패", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
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

        {editing ? (
          <View style={styles.form}>
            <TextInput style={styles.input} placeholder="이름" value={name} onChangeText={setName} />
            <TextInput
              style={styles.input}
              placeholder="소속"
              value={affiliation}
              onChangeText={setAffiliation}
            />
            <PhoneNumberInput value={phone} onChangeValue={setPhone} editable={!saving} />
            <Text style={styles.email}>{user?.email ?? "-"}</Text>

            <View style={styles.formActions}>
              <Pressable style={[styles.formButton, styles.cancelButton]} onPress={() => setEditing(false)} disabled={saving}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable style={[styles.formButton, styles.saveButton]} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? "저장 중..." : "저장"}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.name}>{user?.name ?? "게스트"}</Text>
            {user?.affiliation ? <Text style={styles.meta}>{user.affiliation}</Text> : null}
            <Text style={styles.meta}>{user?.phone ?? "전화번호 미등록"}</Text>

            <Pressable style={styles.editButton} onPress={handleStartEdit}>
              <Text style={styles.editButtonText}>정보 수정</Text>
            </Pressable>

            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>로그아웃</Text>
            </Pressable>

            <Pressable style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
              <Text style={styles.deleteAccountText}>회원탈퇴</Text>
            </Pressable>
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이메일</Text>
          <EmailListEditor
            emails={emails}
            onAdd={async (email) => {
              await usersApi.addEmail(email);
              await loadEmails();
            }}
            onSetPrimary={async (id) => {
              const updated = await usersApi.setPrimaryEmail(id);
              updateUser(updated);
              await loadEmails();
            }}
            onRemove={async (id) => {
              await usersApi.removeEmail(id);
              await loadEmails();
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flexGrow: 1, alignItems: "center", paddingHorizontal: 24, paddingVertical: 32 },
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
  meta: { color: "#888", marginTop: 2 },
  editButton: {
    marginTop: 20,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#111",
  },
  editButtonText: { color: "#fff", fontWeight: "600" },
  logoutButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#DADCE0",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  logoutText: { fontWeight: "600", color: "#B00020" },
  deleteAccountButton: { marginTop: 16, padding: 8 },
  deleteAccountText: { color: "#9CA3AF", fontSize: 12, textDecorationLine: "underline" },
  form: { width: "100%", gap: 10, marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, width: "100%" },
  formActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  formButton: { flex: 1, borderRadius: 8, padding: 12, alignItems: "center" },
  cancelButton: { borderWidth: 1, borderColor: "#DADCE0" },
  cancelButtonText: { fontWeight: "600", color: "#111" },
  saveButton: { backgroundColor: "#111" },
  saveButtonText: { color: "#fff", fontWeight: "600" },
  section: { width: "100%", marginTop: 32 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 8 },
});
