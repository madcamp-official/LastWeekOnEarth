import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GroupsStackParamList } from "../navigation/groupsTypes";
import { contactsApi, type Contact } from "../services/contactsApi";
import { groupsApi } from "../services/groupsApi";

type Props = NativeStackScreenProps<GroupsStackParamList, "AddGroupMembers">;

export function AddGroupMembersScreen({ route }: Props) {
  const { groupId } = route.params;
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allContacts, group] = await Promise.all([contactsApi.list(), groupsApi.get(groupId)]);
      setContacts(allContacts);
      setMemberIds(new Set(group.contacts.map((c) => c.id)));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleToggle = async (contact: Contact) => {
    const isMember = memberIds.has(contact.id);
    setPendingId(contact.id);
    try {
      if (isMember) {
        await groupsApi.removeMember(groupId, contact.id);
        setMemberIds((prev) => {
          const next = new Set(prev);
          next.delete(contact.id);
          return next;
        });
      } else {
        await groupsApi.addMember(groupId, contact.id);
        setMemberIds((prev) => new Set(prev).add(contact.id));
      }
    } finally {
      setPendingId(null);
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
      <Text style={styles.hint}>인맥을 탭해서 그룹에 추가하거나 제외할 수 있습니다.</Text>

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
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>{query ? "검색 결과가 없습니다." : "등록된 인맥이 없습니다."}</Text>
        }
        renderItem={({ item }) => {
          const isMember = memberIds.has(item.id);
          return (
            <Pressable
              style={[styles.row, isMember && styles.rowActive]}
              onPress={() => handleToggle(item)}
              disabled={pendingId === item.id}
            >
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.affiliation ?? "-"}</Text>
              </View>
              <View style={[styles.checkbox, isMember && styles.checkboxActive]}>
                {isMember ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
            </Pressable>
          );
        }}
      />
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
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
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
});
