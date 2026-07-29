import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GroupsStackParamList } from "../navigation/groupsTypes";
import { contactsApi, type Contact } from "../services/contactsApi";
import { groupsApi } from "../services/groupsApi";
import { CheckIcon, SearchIcon } from "../components/Icon";
import { KeyboardAvoidingScreen } from "../components/KeyboardAvoidingScreen";
import { SolidButtonView } from "../components/SolidButtonView";
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<GroupsStackParamList, "AddGroupMembers">;

function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.error) {
    return err.response.data.error;
  }
  return fallback;
}

export function AddGroupMembersScreen({ route, navigation }: Props) {
  const tabBarHeight = useTabBarHeight();
  const { groupId } = route.params;
  const [contacts, setContacts] = useState<Contact[]>([]);
  // 서버에 실제로 저장된 구성원 (변경분 계산의 기준값)
  const [savedMemberIds, setSavedMemberIds] = useState<Set<string>>(new Set());
  // 화면에서 체크/해제한, 아직 저장 전인 상태
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allContacts, group] = await Promise.all([contactsApi.list(), groupsApi.get(groupId)]);
      setContacts(allContacts);
      const ids = new Set(group.contacts.map((c) => c.id));
      setSavedMemberIds(ids);
      setSelectedIds(new Set(ids));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const isDirty = useMemo(() => {
    if (selectedIds.size !== savedMemberIds.size) return true;
    for (const id of selectedIds) {
      if (!savedMemberIds.has(id)) return true;
    }
    return false;
  }, [selectedIds, savedMemberIds]);

  const handleToggle = (contact: Contact) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contact.id)) {
        next.delete(contact.id);
      } else {
        next.add(contact.id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!isDirty) return;
    const toAdd = [...selectedIds].filter((id) => !savedMemberIds.has(id));
    const toRemove = [...savedMemberIds].filter((id) => !selectedIds.has(id));

    setSaving(true);
    try {
      await Promise.all([
        ...toAdd.map((id) => groupsApi.addMember(groupId, id)),
        ...toRemove.map((id) => groupsApi.removeMember(groupId, id)),
      ]);
      navigation.goBack();
    } catch (err) {
      Alert.alert("저장 실패", getErrorMessage(err, "구성원 변경사항을 저장하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.affiliation ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q),
    );
  }, [contacts, query]);

  return (
    <KeyboardAvoidingScreen>
    <View style={styles.container}>
      <Text style={styles.hint}>인맥을 탭해서 체크한 뒤 저장을 눌러주세요.</Text>

      <View style={styles.searchBox}>
        <SearchIcon size={15} color={colors.faint} />
        <TextInput
          style={styles.searchInput}
          placeholder="이름, 소속, 이메일 검색"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
        ListEmptyComponent={
          <Text style={styles.empty}>{query ? "검색 결과가 없습니다." : "등록된 인맥이 없습니다."}</Text>
        }
        renderItem={({ item }) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <Pressable
              style={[styles.row, isSelected && styles.rowActive]}
              onPress={() => handleToggle(item)}
            >
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.affiliation ?? "-"}</Text>
              </View>
              <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                {isSelected ? <CheckIcon size={13} color="#fff" /> : null}
              </View>
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        <Pressable onPress={handleSave} disabled={!isDirty || saving}>
          {!isDirty || saving ? (
            <View style={[styles.saveButton, styles.saveButtonDisabled]}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>저장</Text>
              )}
            </View>
          ) : (
            <SolidButtonView style={styles.saveButton} borderRadius={radius.md}>
              <Text style={styles.saveButtonText}>{`저장 (${selectedIds.size}명)`}</Text>
            </SolidButtonView>
          )}
        </Pressable>
      </View>
    </View>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hint: { color: colors.sub, padding: spacing.lg, paddingBottom: spacing.sm },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: { flex: 1, height: "100%", color: colors.ink },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  rowActive: { borderColor: colors.violet, backgroundColor: colors.violetSoft },
  name: { fontWeight: "600", fontSize: 15, color: colors.ink },
  meta: { color: colors.sub, marginTop: 2, fontSize: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  empty: { textAlign: "center", marginTop: 40, color: colors.faint },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  saveButton: {
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: { backgroundColor: colors.faint },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
