import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { contactsApi, type IncomingUser } from "../services/contactsApi";
import { BackButton } from "../components/BackButton";
import { CheckIcon } from "../components/Icon";
import { GradientView } from "../components/GradientView";
import { notify } from "../utils/confirm";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "IncomingContacts">;

const AVATAR_COLORS = [colors.violet, colors.blue, colors.pink];
const avatarColorFor = (id: string) => AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];

function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.error) {
    return err.response.data.error;
  }
  return fallback;
}

// 인맥 등록은 단방향이라(A가 B를 등록해도 B의 주소록엔 자동으로 안 생김), 나를 등록한 사람 중
// 내가 아직 등록하지 않은 사람만 모아 보여주고 골라서 등록할 수 있게 한다.
export function IncomingContactsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<IncomingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await contactsApi.listIncoming());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleAdd = async (user: IncomingUser) => {
    setAddingIds((prev) => new Set(prev).add(user.id));
    try {
      const contact = await contactsApi.addFromIncoming(user.id);
      setAddedIds((prev) => new Set(prev).add(user.id));
      navigation.navigate("ContactDetail", { contactId: contact.id });
    } catch (err) {
      notify("등록 실패", getErrorMessage(err, "인맥으로 등록하지 못했습니다."));
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.title}>나를 등록한 사람</Text>
        </View>
        <Text style={styles.subtitle}>아직 내 인맥으로 등록하지 않은 사람들이에요</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? "" : "아직 나를 등록했는데 내가 등록하지 않은 사람이 없어요."}
          </Text>
        }
        renderItem={({ item }) => {
          const adding = addingIds.has(item.id);
          const added = addedIds.has(item.id);
          return (
            <View style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: avatarColorFor(item.id) }]}>
                <Text style={styles.avatarText}>{item.name[0]}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.affiliation ?? "-"}</Text>
              </View>
              {added ? (
                <View style={styles.doneRow}>
                  <Text style={styles.done}>등록 완료</Text>
                  <CheckIcon size={13} color={colors.success} />
                </View>
              ) : (
                <Pressable onPress={() => handleAdd(item)} disabled={adding}>
                  <GradientView style={styles.addButton} borderRadius={radius.md}>
                    <Text style={styles.addButtonText}>{adding ? "등록 중..." : "등록"}</Text>
                  </GradientView>
                </Pressable>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.sub, marginTop: 4, marginLeft: 44 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 17, fontWeight: "700", color: "#fff" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 12.5, color: colors.sub, marginTop: 2 },
  addButton: { paddingHorizontal: 16, paddingVertical: 10 },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  done: { color: colors.success, fontWeight: "700", fontSize: 13 },
  empty: { textAlign: "center", marginTop: 40, color: colors.faint },
});
