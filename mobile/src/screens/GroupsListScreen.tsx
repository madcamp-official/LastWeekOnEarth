import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GroupsStackParamList } from "../navigation/groupsTypes";
import { groupsApi, type ContactGroup } from "../services/groupsApi";
import { confirmAction } from "../utils/confirm";
import { GradientView } from "../components/GradientView";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<GroupsStackParamList, "GroupsList">;

function formatFrequency(days: number): string {
  if (days % 365 === 0) return `${days / 365}년`;
  if (days % 30 === 0) return `${days / 30}개월`;
  return `${days}일`;
}

export function GroupsListScreen({ navigation }: Props) {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGroups(await groupsApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleDelete = (group: ContactGroup) => {
    confirmAction(`"${group.name}" 그룹을 삭제하시겠습니까?`, async () => {
      await groupsApi.remove(group.id);
      load();
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>그룹</Text>
        <Pressable onPress={() => navigation.navigate("CreateGroup")}>
          <GradientView style={styles.addButton} borderRadius={radius.sm}>
            <Text style={styles.addButtonText}>+ 새 그룹</Text>
          </GradientView>
        </Pressable>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>아직 그룹이 없습니다. 새 그룹을 만들어보세요.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => navigation.navigate("GroupDetail", { groupId: item.id })}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.memberCount}명</Text>
            </View>
            <View style={styles.rowRight}>
              <View style={styles.freqBadge}>
                <Text style={styles.freqBadgeText}>{formatFrequency(item.frequencyDays)}마다 연락</Text>
              </View>
              <Pressable style={styles.deleteButton} onPress={() => handleDelete(item)} hitSlop={8}>
                <Text style={styles.deleteButtonText}>🗑</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  addButton: { paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: "#fff", fontWeight: "600" },
  list: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
  },
  name: { fontSize: 16, fontWeight: "700", color: colors.ink },
  meta: { color: colors.sub, marginTop: 2 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  freqBadge: { backgroundColor: colors.violetSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  freqBadgeText: { color: colors.violet, fontWeight: "600", fontSize: 12 },
  deleteButton: { padding: 6 },
  deleteButtonText: { fontSize: 16 },
  empty: { textAlign: "center", marginTop: 40, color: colors.faint },
});
