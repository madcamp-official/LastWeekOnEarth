import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GroupsStackParamList } from "../navigation/groupsTypes";
import { contactsApi, type Contact } from "../services/contactsApi";
import { groupsApi } from "../services/groupsApi";

type Props = NativeStackScreenProps<GroupsStackParamList, "AddGroupMembers">;

function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.error) {
    return err.response.data.error;
  }
  return fallback;
}

export function AddGroupMembersScreen({ route, navigation }: Props) {
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
    <View style={styles.container}>
      <Text style={styles.hint}>인맥을 탭해서 체크한 뒤 저장을 눌러주세요.</Text>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
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
        contentContainerStyle={styles.listContent}
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
                {isSelected ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        <Pressable
          style={[styles.saveButton, (!isDirty || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!isDirty || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{isDirty ? `저장 (${selectedIds.size}명)` : "저장"}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hint: { color: "#888", padding: 16, paddingBottom: 8 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F2F2F2",
  },
  searchIcon: { marginRight: 8, fontSize: 14 },
  searchInput: { flex: 1, height: "100%" },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  rowActive: { borderColor: "#111", backgroundColor: "#F7F7F7" },
  name: { fontWeight: "600", fontSize: 15 },
  meta: { color: "#888", marginTop: 2, fontSize: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: "#111", borderColor: "#111" },
  checkboxMark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  empty: { textAlign: "center", marginTop: 40, color: "#999" },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  saveButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: { backgroundColor: "#ccc" },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
