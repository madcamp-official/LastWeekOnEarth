import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { contactsApi, type Contact } from "../services/contactsApi";
import { groupsApi, type ContactGroup } from "../services/groupsApi";
import { confirmAction } from "../utils/confirm";
import { GroupIcon, InboxIcon, PlusIcon, SearchIcon, TrashIcon } from "../components/Icon";
import { KeyboardAvoidingScreen } from "../components/KeyboardAvoidingScreen";
import { SolidButtonView } from "../components/SolidButtonView";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ContactsList">;

const AVATAR_COLORS = [colors.violet, colors.blue, colors.pink];

// 가나다 -> ABC 순: 한글 이름을 먼저, 그다음 영문 이름을 각각 로케일 정렬한다.
function compareByName(a: Contact, b: Contact): number {
  const aKorean = /^[가-힣]/.test(a.name);
  const bKorean = /^[가-힣]/.test(b.name);
  if (aKorean !== bKorean) return aKorean ? -1 : 1;
  return a.name.localeCompare(b.name, aKorean ? "ko" : "en");
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function lastContactLabel(days: number | null): string {
  if (days === null) return "연락 기록 없음";
  if (days < 2) return "오늘";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

function lastContactColor(days: number | null): string {
  if (days === null) return colors.faint;
  if (days >= 60) return colors.danger;
  if (days >= 21) return "#C97A1E";
  return colors.sub;
}

export function ContactsListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [membership, setMembership] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [contactList, groupList] = await Promise.all([contactsApi.list(), groupsApi.list()]);
      setContacts(contactList);
      setGroups(groupList);

      const details = await Promise.all(groupList.map((g) => groupsApi.get(g.id)));
      const nextMembership: Record<string, Set<string>> = {};
      details.forEach((detail) => {
        detail.contacts.forEach((c) => {
          if (!nextMembership[c.id]) nextMembership[c.id] = new Set();
          nextMembership[c.id].add(detail.id);
        });
      });
      setMembership(nextMembership);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = q
      ? contacts.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.affiliation ?? "").toLowerCase().includes(q) ||
            (c.email ?? "").toLowerCase().includes(q),
        )
      : contacts;
    if (groupFilter !== "all") {
      base = base.filter((c) => membership[c.id]?.has(groupFilter));
    }
    return [...base].sort(compareByName);
  }, [contacts, query, groupFilter, membership]);

  const newThisWeekCount = useMemo(
    () => contacts.filter((c) => (daysSince(c.createdAt) ?? 999) < 7).length,
    [contacts],
  );

  const handleDelete = (contact: Contact) => {
    confirmAction(`${contact.name}님을 삭제하시겠습니까?`, async () => {
      await contactsApi.remove(contact.id);
      load();
    });
  };

  return (
    <KeyboardAvoidingScreen>
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>인맥</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton} onPress={() => navigation.navigate("IncomingContacts")}>
            <InboxIcon size={18} color={colors.sub} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => navigation.getParent()?.navigate("Groups")}>
            <GroupIcon size={18} color={colors.sub} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate("AddContact")}>
            <SolidButtonView style={styles.iconButton} borderRadius={radius.md}>
              <PlusIcon size={18} color="#fff" />
            </SolidButtonView>
          </Pressable>
        </View>
      </View>

      <View style={styles.searchBox}>
        <SearchIcon size={15} color={colors.faint} />
        <TextInput
          style={styles.searchInput}
          placeholder="이름, 소속으로 검색"
          placeholderTextColor={colors.faint}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsContent}
        data={[{ id: "all", name: "전체" }, ...groups]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const active = groupFilter === item.id;
          return (
            <Pressable onPress={() => setGroupFilter(item.id)}>
              {active ? (
                <SolidButtonView style={styles.chip} borderRadius={radius.sm}>
                  <Text style={styles.chipTextActive}>{item.name}</Text>
                </SolidButtonView>
              ) : (
                <View style={[styles.chip, styles.chipInactive]}>
                  <Text style={styles.chipText}>{item.name}</Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />

      <Text style={styles.summary}>
        총 {contacts.length}명 · 이번 주 {newThisWeekCount}명 태깅
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          <Text style={styles.empty}>{query ? "검색 결과가 없습니다." : "등록된 인맥이 없습니다."}</Text>
        }
        renderItem={({ item, index }) => {
          const days = daysSince(item.lastContactedAt);
          return (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("ContactDetail", { contactId: item.id })}
            >
              <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }]}>
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{item.name[0]}</Text>
                )}
              </View>

              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {item.affiliation ?? "-"}
                </Text>
              </View>

              <View style={styles.cardRight}>
                <Text style={[styles.lastContact, { color: lastContactColor(days) }]}>{lastContactLabel(days)}</Text>
                <Text style={styles.lastContactHint}>최근 연락</Text>
              </View>

              <Pressable style={styles.deleteButton} onPress={() => handleDelete(item)} hitSlop={8}>
                <TrashIcon size={16} color={colors.faint} />
              </Pressable>
            </Pressable>
          );
        }}
      />
    </View>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 26, fontWeight: "800", color: colors.ink },
  headerActions: { flexDirection: "row", gap: spacing.sm },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, height: "100%", color: colors.ink },
  chipsRow: { flexGrow: 0, marginBottom: spacing.sm },
  chipsContent: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm },
  chipInactive: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.sub },
  chipTextActive: { fontSize: 13, fontWeight: "600", color: "#fff" },
  summary: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm, fontSize: 12.5, color: colors.sub },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, gap: 2 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: { fontWeight: "700", fontSize: 16, color: colors.ink },
  cardMeta: { color: colors.sub, fontSize: 13.5, marginTop: 2 },
  cardRight: { alignItems: "flex-end" },
  lastContact: { fontSize: 12, fontWeight: "600" },
  lastContactHint: { fontSize: 10.5, color: colors.faint, marginTop: 2 },
  deleteButton: { padding: 6 },
  empty: { textAlign: "center", marginTop: 40, color: colors.faint },
});
