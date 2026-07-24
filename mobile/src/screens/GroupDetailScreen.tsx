import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
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

export function GroupDetailScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const [group, setGroup] = useState<ContactGroupDetail | null>(null);

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

  if (!group) return null;

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
  danger: { backgroundColor: "#b00020" },
  buttonText: { color: "#fff", fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 24, marginBottom: 8 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  rowName: { fontWeight: "600" },
  rowMeta: { color: "#888", marginTop: 2 },
  empty: { color: "#999" },
});
