import React, { useCallback, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PostStackParamList } from "../navigation/postTypes";
import { postsApi, type Post } from "../services/postsApi";
import { useAuthStore } from "../store/useAuthStore";
import { confirmAction } from "../utils/confirm";
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

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>소식</Text>
        <Pressable onPress={() => navigation.navigate("CreatePost")}>
          <SolidButtonView style={styles.addButton} borderRadius={radius.sm}>
            <Text style={styles.addButtonText}>+ 소식 올리기</Text>
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
  title: { fontSize: 26, fontWeight: "800", color: colors.ink },
  addButton: { paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: "#fff", fontWeight: "600" },
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
});
