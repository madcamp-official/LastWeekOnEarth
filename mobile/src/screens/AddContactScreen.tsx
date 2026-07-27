import React, { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { contactsApi, type ContactMethod } from "../services/contactsApi";
import { SolidButtonView } from "../components/SolidButtonView";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "AddContact">;

const CONTACT_METHOD_OPTIONS: { label: string; value: ContactMethod }[] = [
  { label: "이메일", value: "EMAIL" },
  { label: "카카오톡", value: "KAKAO" },
  { label: "전화", value: "CALL" },
  { label: "기타", value: "OTHER" },
];

function OptionChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      {active ? (
        <SolidButtonView style={styles.optionChip} borderRadius={radius.pill}>
          <Text style={styles.optionTextActive}>{label}</Text>
        </SolidButtonView>
      ) : (
        <View style={[styles.optionChip, styles.optionChipInactive]}>
          <Text style={styles.optionText}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

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

      <TextInput
        style={styles.input}
        placeholder="이름 *"
        placeholderTextColor={colors.faint}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="소속"
        placeholderTextColor={colors.faint}
        value={affiliation}
        onChangeText={setAffiliation}
      />
      <TextInput
        style={styles.input}
        placeholder="이메일"
        placeholderTextColor={colors.faint}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="전화번호"
        placeholderTextColor={colors.faint}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <Text style={styles.label}>연락 방법</Text>
      <View style={styles.optionRow}>
        {CONTACT_METHOD_OPTIONS.map((option) => (
          <OptionChip
            key={option.value}
            label={option.label}
            active={contactMethod === option.value}
            onPress={() => setContactMethod(option.value)}
          />
        ))}
      </View>
      <TextInput
        style={[styles.input, styles.memo]}
        placeholder="메모"
        placeholderTextColor={colors.faint}
        value={memo}
        onChangeText={setMemo}
        multiline
      />

      <Pressable onPress={handleSubmit} disabled={submitting}>
        <SolidButtonView style={styles.button} borderRadius={radius.md}>
          <Text style={styles.buttonText}>{submitting ? "등록 중..." : "등록"}</Text>
        </SolidButtonView>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg, paddingTop: 24, gap: spacing.md, backgroundColor: colors.bg },
  photoPicker: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    backgroundColor: colors.violetSoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 4,
    overflow: "hidden",
  },
  photo: { width: 88, height: 88 },
  photoPlaceholder: { textAlign: "center", color: colors.violet, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 12,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  label: { fontWeight: "600", color: colors.ink },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  optionChip: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  optionChipInactive: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  optionText: { color: colors.sub, fontWeight: "600" },
  optionTextActive: { color: "#fff", fontWeight: "600" },
  memo: { height: 80, textAlignVertical: "top" },
  button: { padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700" },
});
