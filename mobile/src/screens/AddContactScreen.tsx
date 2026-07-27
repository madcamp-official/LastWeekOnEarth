import React, { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { contactsApi, type ContactMethod } from "../services/contactsApi";

type Props = NativeStackScreenProps<RootStackParamList, "AddContact">;

const CONTACT_METHOD_OPTIONS: { label: string; value: ContactMethod }[] = [
  { label: "이메일", value: "EMAIL" },
  { label: "카카오톡", value: "KAKAO" },
  { label: "전화", value: "CALL" },
  { label: "기타", value: "OTHER" },
];

export function AddContactScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [contactMethod, setContactMethod] = useState<ContactMethod>("OTHER");
  const [submitting, setSubmitting] = useState(false);

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

    setPhotoUrl(`data:image/jpeg;base64,${result.assets[0].base64}`);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("이름을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await contactsApi.create({
        name: name.trim(),
        affiliation: affiliation.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        memo: memo.trim() || undefined,
        photoUrl: photoUrl ?? undefined,
        contactMethod,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert("등록 실패", err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Pressable style={styles.photoPicker} onPress={handlePickPhoto}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} />
        ) : (
          <Text style={styles.photoPlaceholder}>+{"\n"}사진</Text>
        )}
      </Pressable>

      <TextInput style={styles.input} placeholder="이름 *" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="소속" value={affiliation} onChangeText={setAffiliation} />
      <TextInput
        style={styles.input}
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="전화번호"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <Text style={styles.label}>연락 방법</Text>
      <View style={styles.optionRow}>
        {CONTACT_METHOD_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={[styles.optionChip, contactMethod === option.value && styles.optionChipActive]}
            onPress={() => setContactMethod(option.value)}
          >
            <Text style={[styles.optionText, contactMethod === option.value && styles.optionTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={[styles.input, styles.memo]}
        placeholder="메모"
        value={memo}
        onChangeText={setMemo}
        multiline
      />

      <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "등록 중..." : "등록"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, gap: 12 },
  photoPicker: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 4,
    overflow: "hidden",
  },
  photo: { width: 88, height: 88 },
  photoPlaceholder: { textAlign: "center", color: "#999", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12 },
  label: { fontWeight: "600" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  optionChipActive: { backgroundColor: "#111", borderColor: "#111" },
  optionText: { color: "#111", fontWeight: "600" },
  optionTextActive: { color: "#fff" },
  memo: { height: 80, textAlignVertical: "top" },
  button: { backgroundColor: "#111", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
