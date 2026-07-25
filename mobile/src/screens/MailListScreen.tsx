import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MailStackParamList } from "../navigation/mailTypes";
import { mailApi, type MailDraft } from "../services/mailApi";

type Props = NativeStackScreenProps<MailStackParamList, "MailList">;

const STATUS_LABEL: Record<MailDraft["status"], string> = {
  DRAFT: "초안",
  SCHEDULED: "예약됨",
  SENT: "발송됨",
};

export function MailListScreen({ navigation }: Props) {
  const [drafts, setDrafts] = useState<MailDraft[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>메일</Text>
        <Pressable style={styles.addButton} onPress={() => navigation.navigate("ComposeMail")}>
          <Text style={styles.addButtonText}>+ 새 초안</Text>
        </Pressable>
      </View>

      <FlatList
        data={drafts}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>아직 작성한 초안이 없습니다. AI로 연락 초안을 만들어보세요.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate("MailDraftDetail", { draftId: item.id })}
          >
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.contact?.name ?? "삭제된 인맥"}</Text>
              <Text style={styles.rowSubject} numberOfLines={1}>
                {item.channel === "EMAIL" ? item.subject || "(제목 없음)" : item.body}
              </Text>
            </View>
            <View style={styles.badges}>
              <View style={styles.channelBadge}>
                <Text style={styles.channelBadgeText}>{item.channel === "EMAIL" ? "이메일" : "문자"}</Text>
              </View>
              <Text style={styles.statusText}>{STATUS_LABEL[item.status]}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  title: { fontSize: 22, fontWeight: "700" },
  addButton: { backgroundColor: "#111", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: "#fff", fontWeight: "600" },
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowInfo: { flex: 1, marginRight: 8 },
  rowName: { fontSize: 16, fontWeight: "600" },
  rowSubject: { color: "#888", marginTop: 2 },
  badges: { alignItems: "flex-end", gap: 4 },
  channelBadge: { backgroundColor: "#EEF3FF", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  channelBadgeText: { color: "#4285F4", fontWeight: "600", fontSize: 11 },
  statusText: { color: "#999", fontSize: 11 },
  empty: { textAlign: "center", marginTop: 40, color: "#999" },
});
