import React, { useCallback, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PostStackParamList } from "../navigation/postTypes";
import { postsApi, type Post, type PostComment } from "../services/postsApi";
import { useAuthStore } from "../store/useAuthStore";
import { notify } from "../utils/confirm";
import { BackButton } from "../components/BackButton";
import { KeyboardAvoidingScreen } from "../components/KeyboardAvoidingScreen";
import { SolidButtonView } from "../components/SolidButtonView";
import { SendIcon } from "../components/Icon";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<PostStackParamList, "PostDetail">;

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

// 쪽지 대화창의 "소식에 답장" 카드를 탭했을 때 오는 화면 — 그 소식 하나만 보여주고
// 좋아요/댓글까지 그 자리에서 볼 수 있게 한다.
export function PostDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const myUserId = useAuthStore((s) => s.user?.id);
  const { postId } = route.params;
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const load = useCallback(async () => {
    try {
      const [postResult, commentsResult] = await Promise.all([postsApi.get(postId), postsApi.listComments(postId)]);
      setPost(postResult);
      setComments(commentsResult);
    } catch {
      notify("불러오지 못했습니다.", "삭제되었거나 볼 수 없는 소식이에요.");
      navigation.goBack();
    }
  }, [postId, navigation]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleLike = async () => {
    if (!post) return;
    const optimistic = post.likedByMe
      ? { likedByMe: false, likeCount: Math.max(0, post.likeCount - 1) }
      : { likedByMe: true, likeCount: post.likeCount + 1 };
    setPost({ ...post, ...optimistic });
    try {
      const result = post.likedByMe ? await postsApi.unlike(post.id) : await postsApi.like(post.id);
      setPost((prev) => (prev ? { ...prev, ...result } : prev));
    } catch {
      setPost(post);
      notify("처리 실패", "잠시 후 다시 시도해주세요.");
    }
  };

  const submitComment = async () => {
    const content = commentDraft.trim();
    if (!content || sendingComment || !post) return;
    setSendingComment(true);
    try {
      const comment = await postsApi.addComment(post.id, content);
      setComments((prev) => [...prev, comment]);
      setCommentDraft("");
      setPost({ ...post, commentCount: post.commentCount + 1 });
    } catch {
      notify("전송 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setSendingComment(false);
    }
  };

  if (!post) return null;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>소식</Text>
      </View>

      <KeyboardAvoidingScreen>
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={comments}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.authorAvatar}>
                  {post.author.avatarUrl ? (
                    <Image source={{ uri: post.author.avatarUrl }} style={styles.authorAvatarImage} />
                  ) : (
                    <Text style={styles.authorAvatarText}>{post.author.name[0] ?? "?"}</Text>
                  )}
                </View>
                <View style={styles.authorInfo}>
                  <Text style={styles.authorName}>{post.author.name}</Text>
                  <Text style={styles.authorMeta}>
                    {post.author.affiliation ? `${post.author.affiliation} · ` : ""}
                    {formatRelativeTime(post.createdAt)}
                  </Text>
                </View>
              </View>

              <Text style={styles.content}>{post.content}</Text>
              {post.photoUrl ? <Image source={{ uri: post.photoUrl }} style={styles.postPhoto} /> : null}

              <View style={styles.socialRow}>
                <Pressable style={styles.socialButton} onPress={toggleLike} hitSlop={8}>
                  <Text style={[styles.socialButtonText, post.likedByMe && styles.likedText]}>
                    {post.likedByMe ? "♥" : "♡"} 좋아요 {post.likeCount}
                  </Text>
                </Pressable>
                <Text style={styles.socialButtonText}>댓글 {post.commentCount}</Text>
              </View>
            </View>
          }
          ListEmptyComponent={<Text style={styles.empty}>아직 댓글이 없습니다.</Text>}
          renderItem={({ item }) => (
            <View style={styles.commentRow}>
              <Text style={styles.commentAuthor}>{item.author.name}</Text>
              <Text style={styles.commentContent}>{item.content}</Text>
            </View>
          )}
        />

        <View style={[styles.commentInputRow, { paddingBottom: insets.bottom + spacing.sm }]}>
          <TextInput
            style={styles.commentInput}
            placeholder="댓글 달기..."
            placeholderTextColor={colors.faint}
            value={commentDraft}
            onChangeText={setCommentDraft}
            onSubmitEditing={submitComment}
          />
          <Pressable onPress={submitComment} disabled={sendingComment} hitSlop={8}>
            <SolidButtonView style={styles.commentSubmit} borderRadius={radius.md}>
              <SendIcon size={16} color="#fff" />
            </SolidButtonView>
          </Pressable>
        </View>
      </KeyboardAvoidingScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: colors.ink },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
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
  content: { marginTop: 10, fontSize: 14, lineHeight: 20, color: colors.ink },
  postPhoto: { width: "100%", aspectRatio: 1.4, borderRadius: radius.sm, marginTop: 10 },
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
  empty: { textAlign: "center", marginTop: 24, color: colors.faint },
  commentRow: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: 2,
  },
  commentAuthor: { fontWeight: "700", fontSize: 12.5, color: colors.ink },
  commentContent: { fontSize: 13, color: colors.ink },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  commentSubmit: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
});
