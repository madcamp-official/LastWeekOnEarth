import React, { useCallback, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PostStackParamList } from "../navigation/postTypes";
import { postsApi, type Post } from "../services/postsApi";
import { messagesApi } from "../services/messagesApi";
import { notificationsApi } from "../services/notificationsApi";
import { useAuthStore } from "../store/useAuthStore";
import { confirmAction, notify } from "../utils/confirm";
import { PlusIcon, BellIcon, ChatIcon } from "../components/Icon";
import { SolidButtonView } from "../components/SolidButtonView";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<PostStackParamList, "PostFeed">;
type Tab = "MINE" | "NEIGHBORS";

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

export function PostFeedScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const myUserId = useAuthStore((s) => s.user?.id);
  const [tab, setTab] = useState<Tab>("MINE");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyingPostId, setReplyingPostId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadDmCount, setUnreadDmCount] = useState(0);
  const activeTab = route.params?.initialTab ?? tab;

  const load = useCallback(async (target: Tab) => {
    setLoading(true);
    try {
      setPosts(target === "MINE" ? await postsApi.listMine() : await postsApi.listFeed());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setTab(activeTab);
      load(activeTab);
      notificationsApi.unreadCount().then(setUnreadCount);
      messagesApi.unreadCount().then(setUnreadDmCount);
    }, [activeTab, load, route.params?.refreshKey]),
  );

  const selectTab = (nextTab: Tab) => {
    navigation.setParams({ initialTab: undefined, refreshKey: undefined });
    setTab(nextTab);
  };

  const handleDelete = (post: Post) => {
    confirmAction("이 소식을 삭제하시겠습니까?", async () => {
      await postsApi.remove(post.id);
      load(activeTab);
    });
  };

  const toggleLike = async (post: Post) => {
    // 낙관적 업데이트: 서버 응답 기다리지 않고 바로 반영하고, 실패하면 되돌린다.
    const optimistic = post.likedByMe
      ? { likedByMe: false, likeCount: Math.max(0, post.likeCount - 1) }
      : { likedByMe: true, likeCount: post.likeCount + 1 };
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...optimistic } : p)));

    try {
      const result = post.likedByMe ? await postsApi.unlike(post.id) : await postsApi.like(post.id);
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...result } : p)));
    } catch {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
      notify("처리 실패", "잠시 후 다시 시도해주세요.");
    }
  };

  const toggleReply = (postId: string) => {
    setReplyingPostId((prev) => (prev === postId ? null : postId));
  };

  const submitReply = async (post: Post) => {
    const content = (replyDrafts[post.id] ?? "").trim();
    if (!content || sendingReply) return;
    setSendingReply(true);
    try {
      await messagesApi.send(post.authorId, { content, postId: post.id });
      setReplyDrafts((prev) => ({ ...prev, [post.id]: "" }));
      setReplyingPostId(null);
      navigation.navigate("ChatThread", { userId: post.authorId, userName: post.author.name });
    } catch {
      notify("전송 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>소식</Text>
          <Pressable onPress={() => navigation.navigate("Conversations")} hitSlop={8} style={styles.bellButton}>
            <ChatIcon size={21} color={colors.ink} />
            {unreadDmCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadDmCount > 9 ? "9+" : unreadDmCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Notifications")} hitSlop={8} style={styles.bellButton}>
            <BellIcon size={22} color={colors.ink} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
        <Pressable onPress={() => navigation.navigate("CreatePost")}>
          <SolidButtonView style={styles.addButton} borderRadius={radius.md}>
            <PlusIcon size={18} color="#fff" />
          </SolidButtonView>
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        <Pressable style={styles.tabButton} onPress={() => selectTab("MINE")}>
          {activeTab === "MINE" ? (
            <SolidButtonView style={styles.tab} borderRadius={radius.md}>
              <Text style={styles.tabTextActive}>내 소식</Text>
            </SolidButtonView>
          ) : (
            <View style={[styles.tab, styles.tabInactive]}>
              <Text style={styles.tabText}>내 소식</Text>
            </View>
          )}
        </Pressable>
        <Pressable style={styles.tabButton} onPress={() => selectTab("NEIGHBORS")}>
          {activeTab === "NEIGHBORS" ? (
            <SolidButtonView style={styles.tab} borderRadius={radius.md}>
              <Text style={styles.tabTextActive}>이웃 소식</Text>
            </SolidButtonView>
          ) : (
            <View style={[styles.tab, styles.tabInactive]}>
              <Text style={styles.tabText}>이웃 소식</Text>
            </View>
          )}
        </Pressable>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={() => load(activeTab)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {activeTab === "MINE"
              ? "아직 올린 소식이 없습니다."
              : "이웃 소식이 없습니다. BLE로 태깅했거나 이메일이 일치하는 인맥이 계정을 가지고 있어야 보여요."}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.authorAvatar}>
                {item.author.avatarUrl ? (
                  <Image source={{ uri: item.author.avatarUrl }} style={styles.authorAvatarImage} />
                ) : (
                  <Text style={styles.authorAvatarText}>{item.author.name[0] ?? "?"}</Text>
                )}
              </View>
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{item.author.name}</Text>
                <Text style={styles.authorMeta}>
                  {item.author.affiliation ? `${item.author.affiliation} · ` : ""}
                  {formatRelativeTime(item.createdAt)}
                </Text>
              </View>
              {item.authorId === myUserId && (
                <Pressable onPress={() => handleDelete(item)} hitSlop={8}>
                  <Text style={styles.deleteText}>삭제</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.content}>{item.content}</Text>
            {item.photoUrl ? <Image source={{ uri: item.photoUrl }} style={styles.postPhoto} /> : null}

            <View style={styles.socialRow}>
              <Pressable style={styles.socialButton} onPress={() => toggleLike(item)} hitSlop={8}>
                <Text style={[styles.socialButtonText, item.likedByMe && styles.likedText]}>
                  {item.likedByMe ? "♥" : "♡"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => item.likeCount > 0 && navigation.navigate("PostLikes", { postId: item.id })}
                hitSlop={8}
                disabled={item.likeCount === 0}
              >
                <Text style={styles.socialButtonText}>좋아요 {item.likeCount}</Text>
              </Pressable>
              {item.authorId !== myUserId && (
                <Pressable style={styles.socialButton} onPress={() => toggleReply(item.id)} hitSlop={8}>
                  <Text style={styles.socialButtonText}>답장</Text>
                </Pressable>
              )}
            </View>

            {replyingPostId === item.id && (
              <View style={styles.commentsBox}>
                <View style={styles.commentInputRow}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder={`${item.author.name}님에게 쪽지 보내기...`}
                    placeholderTextColor={colors.faint}
                    value={replyDrafts[item.id] ?? ""}
                    onChangeText={(text) => setReplyDrafts((prev) => ({ ...prev, [item.id]: text }))}
                    onSubmitEditing={() => submitReply(item)}
                  />
                  <Pressable onPress={() => submitReply(item)} hitSlop={8} disabled={sendingReply}>
                    <Text style={styles.commentSubmit}>보내기</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontSize: 26, fontWeight: "800", color: colors.ink },
  bellButton: { padding: 4 },
  bellBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: colors.pink,
    borderRadius: radius.pill,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: { flexDirection: "row", paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
  tabButton: { flex: 1 },
  tab: { width: "100%", height: 48, alignItems: "center", justifyContent: "center" },
  tabInactive: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md },
  tabText: { fontWeight: "600", color: colors.sub },
  tabTextActive: { color: "#fff", fontWeight: "600" },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.violet,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  authorAvatarImage: { width: 36, height: 36 },
  authorAvatarText: { color: "#fff", fontWeight: "700" },
  authorInfo: { flex: 1 },
  authorName: { fontWeight: "700", fontSize: 14, color: colors.ink },
  authorMeta: { color: colors.sub, fontSize: 12, marginTop: 1 },
  deleteText: { color: colors.danger, fontSize: 12, fontWeight: "600" },
  content: { marginTop: 10, fontSize: 14, lineHeight: 20, color: colors.ink },
  postPhoto: { width: "100%", aspectRatio: 1.4, borderRadius: radius.sm, marginTop: 10 },
  empty: { textAlign: "center", marginTop: 40, color: colors.faint, paddingHorizontal: 24 },
  socialRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  socialButton: { flexDirection: "row", alignItems: "center" },
  socialButtonText: { color: colors.sub, fontWeight: "600", fontSize: 13 },
  likedText: { color: colors.pink },
  commentsBox: { marginTop: 10, gap: 8 },
  commentRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  commentAuthor: { fontWeight: "700", fontSize: 12.5, color: colors.ink },
  commentContent: { fontSize: 12.5, color: colors.ink, flexShrink: 1 },
  commentDelete: { color: colors.danger, fontSize: 11, marginLeft: "auto" },
  commentInputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  commentSubmit: { color: colors.violet, fontWeight: "700", fontSize: 13 },
});
