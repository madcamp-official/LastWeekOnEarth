import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GroupsStackParamList } from "../navigation/groupsTypes";
import { groupsApi } from "../services/groupsApi";

type Props = NativeStackScreenProps<GroupsStackParamList, "CreateGroup">;

const FREQUENCY_OPTIONS = [
  { label: "1개월", days: 30 },
  { label: "3개월", days: 90 },
  { label: "6개월", days: 180 },
  { label: "1년", days: 365 },
];

export function CreateGroupScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [frequencyDays, setFrequencyDays] = useState(90);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("그룹 이름을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await groupsApi.create({ name: name.trim(), frequencyDays });
      navigation.goBack();
    } catch {
      Alert.alert("생성 실패", "그룹을 만들지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>그룹 이름</Text>
      <TextInput style={styles.input} placeholder="예: 대학 동기" value={name} onChangeText={setName} />

      <Text style={styles.label}>연락 빈도</Text>
      <View style={styles.freqRow}>
        {FREQUENCY_OPTIONS.map((opt) => (
          <Pressable
            key={opt.days}
            style={[styles.freqChip, frequencyDays === opt.days && styles.freqChipActive]}
            onPress={() => setFrequencyDays(opt.days)}
          >
            <Text style={[styles.freqChipText, frequencyDays === opt.days && styles.freqChipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "만드는 중..." : "그룹 만들기"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  label: { fontWeight: "600", marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12 },
  freqRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  freqChip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  freqChipActive: { backgroundColor: "#111", borderColor: "#111" },
  freqChipText: { color: "#111", fontWeight: "600" },
  freqChipTextActive: { color: "#fff" },
  button: { backgroundColor: "#111", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
