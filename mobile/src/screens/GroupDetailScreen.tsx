import React, { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GroupsStackParamList } from "../navigation/groupsTypes";
import { groupsApi, type ContactGroupDetail } from "../services/groupsApi";
import { confirmAction } from "../utils/confirm";

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
      <View style={styles.container}>
        <Text style={styles.label}>그룹 이름</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />

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

        <View style={styles.actions}>
          <Pressable style={[styles.button, styles.actionButton, styles.cancelButton]} onPress={() => setEditing(false)} disabled={saving}>
            <Text style={styles.cancelButtonText}>취소</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.actionButton]} onPress={handleSave} disabled={saving}>
            <Text style={styles.buttonText}>{saving ? "저장 중..." : "저장"}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{group.name}</Text>
      <Text style={styles.freq}>{formatFrequency(group.frequencyDays)}마다 연락</Text>

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.actionButton]}
          onPress={() => navigation.navigate("AddGroupMembers", { groupId })}
        >
          <Text style={styles.buttonText}>+ 구성원 추가</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.actionButton]} onPress={handleStartEdit}>
          <Text style={styles.buttonText}>정보 수정</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.actionButton, styles.danger]} onPress={handleDelete}>
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
  container: { flex: 1, padding: 16 },
  name: { fontSize: 22, fontWeight: "700" },
  freq: { color: "#4285F4", fontWeight: "600", marginTop: 4 },
  actions: { flexDirection: "row", gap: 8, marginTop: 16 },
  button: { backgroundColor: "#111", borderRadius: 8, padding: 12, alignItems: "center" },
  actionButton: { flex: 1 },
  cancelButton: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#DADCE0" },
  cancelButtonText: { fontWeight: "600", color: "#111" },
  danger: { backgroundColor: "#b00020" },
  buttonText: { color: "#fff", fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 24, marginBottom: 8 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  rowName: { fontWeight: "600" },
  rowMeta: { color: "#888", marginTop: 2 },
  empty: { color: "#999" },
  label: { fontWeight: "600", marginTop: 8, marginBottom: 8 },
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
});
