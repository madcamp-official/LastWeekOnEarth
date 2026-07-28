import React, { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GroupsStackParamList } from "../navigation/groupsTypes";
import { groupsApi, type ContactGroupDetail } from "../services/groupsApi";
import { confirmAction } from "../utils/confirm";
import { KeyboardAvoidingScreen } from "../components/KeyboardAvoidingScreen";
import { SolidButtonView } from "../components/SolidButtonView";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<GroupsStackParamList, "GroupDetail">;

function formatFrequency(days: number): string {
  if (days % 365 === 0) return `${days / 365}년`;
  if (days % 30 === 0) return `${days / 30}개월`;
  return `${days}일`;
}

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

export function GroupDetailScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const [group, setGroup] = useState<ContactGroupDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [frequencyDays, setFrequencyDays] = useState(90);

  const load = useCallback(async () => {
    setGroup(await groupsApi.get(groupId));
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleDelete = () => {
    confirmAction("그룹을 삭제하시겠습니까?", async () => {
      await groupsApi.remove(groupId);
      navigation.goBack();
    });
  };

  const handleStartEdit = () => {
    if (!group) return;
    setName(group.name);
    setFrequencyDays(group.frequencyDays);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("그룹 이름을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      await groupsApi.update(groupId, { name: name.trim(), frequencyDays });
      await load();
      setEditing(false);
    } catch {
      Alert.alert("저장 실패", "그룹 정보를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!group) return null;

  if (editing) {
    return (
      <KeyboardAvoidingScreen>
      <View style={styles.container}>
        <Text style={styles.label}>그룹 이름</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />

        <Text style={styles.label}>연락 빈도</Text>
        <View style={styles.freqRow}>
          {FREQUENCY_OPTIONS.map((opt) => (
            <Chip
              key={opt.days}
              label={opt.label}
              active={frequencyDays === opt.days}
              onPress={() => setFrequencyDays(opt.days)}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={() => setEditing(false)} disabled={saving}>
            <Text style={styles.cancelButtonText}>취소</Text>
          </Pressable>
          <Pressable style={styles.actionButtonFlex} onPress={handleSave} disabled={saving}>
            <SolidButtonView style={styles.button} borderRadius={radius.md}>
              <Text style={styles.buttonText}>{saving ? "저장 중..." : "저장"}</Text>
            </SolidButtonView>
          </Pressable>
        </View>
      </View>
      </KeyboardAvoidingScreen>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{group.name}</Text>
      <Text style={styles.freq}>{formatFrequency(group.frequencyDays)}마다 연락</Text>

      <View style={styles.actions}>
        <Pressable style={styles.actionButtonFlex} onPress={() => navigation.navigate("AddGroupMembers", { groupId })}>
          <SolidButtonView style={styles.button} borderRadius={radius.md}>
            <Text style={styles.buttonText}>+ 구성원 수정</Text>
          </SolidButtonView>
        </Pressable>
        <Pressable style={styles.actionButtonFlex} onPress={handleStartEdit}>
          <SolidButtonView style={styles.button} borderRadius={radius.md}>
            <Text style={styles.buttonText}>정보 수정</Text>
          </SolidButtonView>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.danger]} onPress={handleDelete}>
          <Text style={styles.buttonText}>그룹 삭제</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>구성원 ({group.contacts.length}명)</Text>
      <FlatList
        data={group.contacts}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>아직 추가된 인맥이 없습니다.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowName}>{item.name}</Text>
            <Text style={styles.rowMeta}>{item.affiliation ?? "-"}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  name: { fontSize: 22, fontWeight: "800", color: colors.ink },
  freq: { color: colors.violet, fontWeight: "600", marginTop: 4 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  button: { flex: 1, alignItems: "center", justifyContent: "center" },
  actionButton: { flex: 1, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  actionButtonFlex: { flex: 1, height: 48 },
  cancelButton: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  cancelButtonText: { fontWeight: "600", color: colors.ink },
  danger: { backgroundColor: colors.danger },
  buttonText: { color: "#fff", fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 24, marginBottom: 8, color: colors.ink },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowName: { fontWeight: "600", color: colors.ink },
  rowMeta: { color: colors.sub, marginTop: 2 },
  empty: { color: colors.faint },
  label: { fontWeight: "600", marginTop: 8, marginBottom: 8, color: colors.ink },
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
});
