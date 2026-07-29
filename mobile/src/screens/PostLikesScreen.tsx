import React, { useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PostStackParamList } from "../navigation/postTypes";
import { postsApi, type PostLiker } from "../services/postsApi";
import { BackButton } from "../components/BackButton";
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<PostStackParamList, "PostLikes">;

export function PostLikesScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const [likers, setLikers] = useState<PostLiker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    postsApi
      .listLikes(route.params.postId)
      .then(setLikers)
      .finally(() => setLoading(false));
  }, [route.params.postId]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>좋아요</Text>
      </View>

      <FlatList
        data={likers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight }]}
        ListEmptyComponent={
          <Text style={styles.empty}>{loading ? "" : "아직 좋아요를 누른 사람이 없습니다."}</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}>
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{item.name[0] ?? "?"}</Text>
              )}
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              {item.affiliation ? <Text style={styles.meta}>{item.affiliation}</Text> : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.lg },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.violet,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 40, height: 40 },
  avatarText: { color: "#fff", fontWeight: "700" },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 12.5, color: colors.sub, marginTop: 2 },
  empty: { textAlign: "center", marginTop: 40, color: colors.faint },
});
