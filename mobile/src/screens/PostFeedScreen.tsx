import React, { useCallback, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PostStackParamList } from "../navigation/postTypes";
import { postsApi, type Post } from "../services/postsApi";
import { useAuthStore } from "../store/useAuthStore";
import { confirmAction } from "../utils/confirm";

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

export function PostFeedScreen({ navigation }: Props) {
  const myUserId = useAuthStore((s) => s.user?.id);
  const [tab, setTab] = useState<Tab>("MINE");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

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
      load(tab);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]),
  );

  const handleDelete = (post: Post) => {
    confirmAction("이 소식을 삭제하시겠습니까?", async () => {
      await postsApi.remove(post.id);
      load(tab);
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>소식</Text>
        <Pressable style={styles.addButton} onPress={() => navigation.navigate("CreatePost")}>
          <Text style={styles.addButtonText}>+ 소식 올리기</Text>
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        <Pressable style={[styles.tab, tab === "MINE" && styles.tabActive]} onPress={() => setTab("MINE")}>
          <Text style={[styles.tabText, tab === "MINE" && styles.tabTextActive]}>내 소식</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "NEIGHBORS" && styles.tabActive]}
          onPress={() => setTab("NEIGHBORS")}
        >
          <Text style={[styles.tabText, tab === "NEIGHBORS" && styles.tabTextActive]}>이웃 소식</Text>
        </Pressable>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={() => load(tab)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {tab === "MINE"
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
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  title: { fontSize: 22, fontWeight: "700" },
  addButton: { backgroundColor: "#111", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: "#fff", fontWeight: "600" },
  tabRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center", backgroundColor: "#F2F2F2" },
  tabActive: { backgroundColor: "#111" },
  tabText: { fontWeight: "600", color: "#666" },
  tabTextActive: { color: "#fff" },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  card: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#eee", padding: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  authorAvatarImage: { width: 36, height: 36 },
  authorAvatarText: { color: "#fff", fontWeight: "700" },
  authorInfo: { flex: 1 },
  authorName: { fontWeight: "700", fontSize: 14 },
  authorMeta: { color: "#888", fontSize: 12, marginTop: 1 },
  deleteText: { color: "#B00020", fontSize: 12, fontWeight: "600" },
  content: { marginTop: 10, fontSize: 14, lineHeight: 20 },
  postPhoto: { width: "100%", aspectRatio: 1.4, borderRadius: 8, marginTop: 10 },
  empty: { textAlign: "center", marginTop: 40, color: "#999", paddingHorizontal: 24 },
});
