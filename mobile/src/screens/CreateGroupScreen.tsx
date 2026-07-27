import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GroupsStackParamList } from "../navigation/groupsTypes";
import { groupsApi } from "../services/groupsApi";
import { SolidButtonView } from "../components/SolidButtonView";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<GroupsStackParamList, "CreateGroup">;

const FREQUENCY_OPTIONS = [
  { label: "1개월", days: 30 },
  { label: "3개월", days: 90 },
  { label: "6개월", days: 180 },
  { label: "1년", days: 365 },
];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      {active ? (
        <SolidButtonView style={styles.freqChip} borderRadius={radius.pill}>
          <Text style={styles.freqChipTextActive}>{label}</Text>
        </SolidButtonView>
      ) : (
        <View style={[styles.freqChip, styles.freqChipInactive]}>
          <Text style={styles.freqChipText}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

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
      <TextInput
        style={styles.input}
        placeholder="예: 대학 동기"
        placeholderTextColor={colors.faint}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>연락 빈도</Text>
      <View style={styles.freqRow}>
        {FREQUENCY_OPTIONS.map((opt) => (
          <Chip key={opt.days} label={opt.label} active={frequencyDays === opt.days} onPress={() => setFrequencyDays(opt.days)} />
        ))}
      </View>

      <Pressable onPress={handleSubmit} disabled={submitting}>
        <SolidButtonView style={styles.button} borderRadius={radius.md}>
          <Text style={styles.buttonText}>{submitting ? "만드는 중..." : "그룹 만들기"}</Text>
        </SolidButtonView>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.bg },
  label: { fontWeight: "600", marginTop: 8, color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 12,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  freqRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  freqChip: { borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8 },
  freqChipInactive: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  freqChipText: { color: colors.sub, fontWeight: "600" },
  freqChipTextActive: { color: "#fff", fontWeight: "600" },
  button: { padding: 14, alignItems: "center", marginTop: 24 },
  buttonText: { color: "#fff", fontWeight: "700" },
});
