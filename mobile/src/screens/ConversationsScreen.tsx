import React, { useCallback, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PostStackParamList } from "../navigation/postTypes";
import { messagesApi, type Conversation } from "../services/messagesApi";
import { BackButton } from "../components/BackButton";
import { PlusIcon } from "../components/Icon";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<PostStackParamList, "Conversations">;

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(iso).toLocaleDateString();
}

export function ConversationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setConversations(await messagesApi.listConversations());
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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.title}>쪽지</Text>
        </View>
        <Pressable onPress={() => navigation.navigate("NewConversation")} hitSlop={8}>
          <PlusIcon size={20} color={colors.ink} />
        </Pressable>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.partner.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? "" : "아직 주고받은 쪽지가 없습니다."}</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.navigate("ChatThread", { userId: item.partner.id, userName: item.partner.name })
            }
          >
            <View style={styles.avatar}>
              {item.partner.avatarUrl ? (
                <Image source={{ uri: item.partner.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{item.partner.name[0] ?? "?"}</Text>
              )}
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.partner.name}</Text>
              {item.lastMessage.post && (
                <Text style={styles.postRef} numberOfLines={1}>
                  소식에 답장: {item.lastMessage.post.content}
                </Text>
              )}
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessage.content}
              </Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.time}>{formatRelativeTime(item.lastMessage.createdAt)}</Text>
              {item.unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontSize: 20, fontWeight: "800", color: colors.ink },
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 44, height: 44 },
  avatarText: { color: "#fff", fontWeight: "700" },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: colors.ink },
  postRef: { fontSize: 11, color: colors.violet, fontWeight: "600", marginTop: 2 },
  preview: { fontSize: 12.5, color: colors.sub, marginTop: 2 },
  metaCol: { alignItems: "flex-end", gap: 4 },
  time: { fontSize: 11, color: colors.faint },
  badge: { backgroundColor: colors.pink, borderRadius: radius.pill, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 10.5, fontWeight: "700" },
  empty: { textAlign: "center", marginTop: 40, color: colors.faint },
});
