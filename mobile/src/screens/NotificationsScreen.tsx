import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PostStackParamList } from "../navigation/postTypes";
import { notificationsApi, type AppNotification } from "../services/notificationsApi";
import { BackButton } from "../components/BackButton";
import { useFocusedInterval } from "../hooks/useFocusedInterval";
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import { getSocket } from "../services/socket";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<PostStackParamList, "Notifications">;

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

function describe(n: AppNotification): string {
  switch (n.type) {
    case "POST_LIKE":
      return `${n.actor?.name ?? "누군가"}님이 회원님의 소식을 좋아합니다.`;
    case "DM_MESSAGE":
      return `${n.actor?.name ?? "누군가"}님이 쪽지를 보냈습니다.`;
    case "NEW_POST":
      return `${n.actor?.name ?? "누군가"}님이 새 소식을 올렸어요.`;
    case "CONTACT_REMINDER":
      return `${n.contact?.name ?? "인맥"}님에게 연락한 지 오래됐어요.`;
    default:
      return "새 알림";
  }
}

export function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await notificationsApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  // 소켓 안전망 폴링 — 새 알림은 아래 소켓 리스너로 즉시 목록 맨 위에 추가된다.
  useFocusedInterval(load, 20000);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleNewNotification = (n: AppNotification) => {
      setItems((prev) => (prev.some((it) => it.id === n.id) ? prev : [n, ...prev]));
    };
    socket.on("notification:new", handleNewNotification);
    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, []);

  const handlePress = async (n: AppNotification) => {
    if (!n.read) {
      await notificationsApi.markRead(n.id);
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)));
    }
    if (n.type === "POST_LIKE" && n.postId) {
      navigation.navigate("PostLikes", { postId: n.postId });
    } else if (n.type === "NEW_POST" && n.postId) {
      navigation.navigate("PostDetail", { postId: n.postId });
    } else if (n.type === "DM_MESSAGE" && n.actor) {
      navigation.navigate("ChatThread", { userId: n.actor.id, userName: n.actor.name });
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.title}>알림</Text>
        </View>
        {items.some((n) => !n.read) && (
          <Pressable
            onPress={async () => {
              await notificationsApi.markAllRead();
              setItems((prev) => prev.map((it) => ({ ...it, read: true })));
            }}
          >
            <Text style={styles.markAll}>모두 읽음</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight }]}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? "" : "아직 알림이 없습니다."}</Text>}
        renderItem={({ item }) => (
          <Pressable style={[styles.row, !item.read && styles.rowUnread]} onPress={() => handlePress(item)}>
            {!item.read && <View style={styles.dot} />}
            <View style={styles.info}>
              <Text style={styles.text}>{describe(item)}</Text>
              <Text style={styles.time}>{formatRelativeTime(item.createdAt)}</Text>
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
    padding: spacing.lg,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  markAll: { color: colors.violet, fontWeight: "700", fontSize: 13 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  rowUnread: { borderColor: colors.violet },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.violet, marginTop: 5 },
  info: { flex: 1 },
  text: { fontSize: 13.5, color: colors.ink, lineHeight: 19 },
  time: { fontSize: 11, color: colors.faint, marginTop: 4 },
  empty: { textAlign: "center", marginTop: 40, color: colors.faint },
});
