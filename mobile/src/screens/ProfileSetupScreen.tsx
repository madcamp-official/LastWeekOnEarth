import React, { useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import { usersApi } from "../services/usersApi";
import { PhoneNumberInput } from "../components/PhoneNumberInput";

const PHONE_REGEX = /^\d{2,3}-\d{3,4}-\d{4}$/;

/**
 * 방금 자동 가입된 유저(소속/전화번호가 비어있음 — Google 로그인도 해당)에게 보여주는 화면.
 * 저장에 성공하면 updateUser로 store가 채워지고, App.tsx가 이를 감지해 자동으로
 * 메인 화면(RootNavigator)으로 넘어간다 — 별도 네비게이션 처리가 필요 없다.
 */
export default function ProfileSetupScreen() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  // Google 로그인은 이름을 이미 채워서 주므로 미리 넣어두고, 이메일 가입은 빈 값에서 시작한다.
  const [name, setName] = useState(user?.name ?? "");
  const [affiliation, setAffiliation] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !affiliation.trim() || !phone.trim()) {
      Alert.alert("이름, 소속, 전화번호를 모두 입력해주세요.");
      return;
    }
    if (!PHONE_REGEX.test(phone.trim())) {
      Alert.alert("전화번호를 빈칸 없이 모두 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const updated = await usersApi.updateProfile({
        name: name.trim(),
        affiliation: affiliation.trim(),
        phone: phone.trim(),
      });
      updateUser(updated);
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>프로필을 완성해주세요</Text>
        <Text style={styles.subtitle}>{user?.email} 계정으로 가입 중이에요</Text>

        <TextInput style={styles.input} placeholder="이름 *" value={name} onChangeText={setName} editable={!saving} />
        <TextInput
          style={styles.input}
          placeholder="소속 *"
          value={affiliation}
          onChangeText={setAffiliation}
          editable={!saving}
        />
        <PhoneNumberInput value={phone} onChangeValue={setPhone} editable={!saving} />

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={saving} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{saving ? "저장 중..." : "시작하기"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 13, color: "#6B7280", marginBottom: 28 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#DADCE0",
    borderRadius: 8,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  button: {
    marginTop: 12,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
