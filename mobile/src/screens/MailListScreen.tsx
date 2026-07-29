import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MailStackParamList } from "../navigation/mailTypes";
import { mailApi, type MailDraft } from "../services/mailApi";
import { PlusIcon, SearchIcon } from "../components/Icon";
import { KeyboardAvoidingScreen } from "../components/KeyboardAvoidingScreen";
import { SolidButtonView } from "../components/SolidButtonView";
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<MailStackParamList, "MailList">;

const STATUS_LABEL: Record<MailDraft["status"], string> = {
  DRAFT: "초안",
  SCHEDULED: "예약됨",
  SENT: "발송됨",
};

const STATUS_META: Record<MailDraft["status"], { bg: string; color: string }> = {
  DRAFT: { bg: "#EDEAF3", color: colors.sub },
  SCHEDULED: { bg: colors.violetSoft, color: colors.violet },
  SENT: { bg: "#E4F5EA", color: colors.success },
};

const STATUS_FILTERS: { key: "all" | MailDraft["status"]; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "DRAFT", label: "초안" },
  { key: "SCHEDULED", label: "예약됨" },
  { key: "SENT", label: "발송됨" },
];

export function MailListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const [drafts, setDrafts] = useState<MailDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MailDraft["status"]>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDrafts(await mailApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filteredDrafts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    let base = drafts;
    if (statusFilter !== "all") base = base.filter((d) => d.status === statusFilter);
    if (!normalizedQuery) return base;

    return base.filter((draft) =>
      [
        draft.contact?.name,
        draft.contact?.affiliation,
        draft.group?.name,
        draft.subject,
        draft.body,
        draft.channel === "EMAIL" ? "이메일" : "문자",
        STATUS_LABEL[draft.status],
      ].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)),
    );
  }, [drafts, query, statusFilter]);

  return (
    <KeyboardAvoidingScreen>
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>메일함</Text>
        <View style={styles.headerButtons}>
          <Pressable style={styles.settingsButton} onPress={() => navigation.navigate("GmailSettings")} hitSlop={8}>
            <Text style={styles.settingsButtonText}>Gmail 연동</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("ComposeMail")}>
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
          value={query}
          onChangeText={setQuery}
          placeholder="이름, 제목, 내용으로 초안 검색"
          placeholderTextColor={colors.faint}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsContent}
        data={STATUS_FILTERS}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          const active = statusFilter === item.key;
          return (
            <Pressable onPress={() => setStatusFilter(item.key)}>
              {active ? (
                <SolidButtonView style={styles.chip} borderRadius={radius.sm}>
                  <Text style={styles.chipTextActive}>{item.label}</Text>
                </SolidButtonView>
              ) : (
                <View style={[styles.chip, styles.chipInactive]}>
                  <Text style={styles.chipText}>{item.label}</Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />

      <FlatList
        data={filteredDrafts}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight }]}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {query.trim()
              ? "검색 결과가 없습니다."
              : "아직 작성한 초안이 없습니다. AI로 연락 초안을 만들어보세요."}
          </Text>
        }
        renderItem={({ item }) => {
          const meta = STATUS_META[item.status];
          return (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("MailDraftDetail", { draftId: item.id })}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.contact?.name ?? (item.group ? `${item.group.name} (그룹 공통)` : "삭제된 인맥")}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: meta.color }]}>{STATUS_LABEL[item.status]}</Text>
                </View>
              </View>
              <Text style={styles.rowSubject} numberOfLines={1}>
                {item.channel === "EMAIL" ? item.subject || "(제목 없음)" : item.body}
              </Text>
              <View style={styles.channelBadge}>
                <Text style={styles.channelBadgeText}>{item.channel === "EMAIL" ? "이메일" : "문자"}</Text>
              </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: { fontSize: 26, fontWeight: "800", color: colors.ink },
  headerButtons: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  settingsButton: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
  },
  settingsButtonText: { color: colors.sub, fontWeight: "600", fontSize: 12 },
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
    marginBottom: spacing.sm,
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
  list: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  rowName: { fontSize: 15, fontWeight: "700", color: colors.ink, flexShrink: 1 },
  rowSubject: { color: colors.sub, fontSize: 13 },
  statusBadge: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontWeight: "700", fontSize: 10.5 },
  channelBadge: { alignSelf: "flex-start", backgroundColor: colors.blueSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  channelBadgeText: { color: colors.blue, fontWeight: "600", fontSize: 11 },
  empty: { textAlign: "center", marginTop: 40, color: colors.faint },
});
