import React, { useEffect, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PostStackParamList } from "../navigation/postTypes";
import { messagesApi } from "../services/messagesApi";
import type { PostAuthor } from "../services/postsApi";
import { BackButton } from "../components/BackButton";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<PostStackParamList, "NewConversation">;

// 아직 쪽지를 주고받은 적 없어도, 소식 피드처럼 "이웃"(BLE 태깅/이메일 매칭)이면 바로 대화를 시작할 수 있다.
export function NewConversationScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<PostAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    messagesApi
      .listContacts()
      .then(setContacts)
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>새 대화</Text>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? "" : "대화를 시작할 수 있는 인맥이 없습니다. BLE로 태깅했거나 이메일이 일치하는 인맥이 계정을 가지고 있어야 해요."}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.replace("ChatThread", { userId: item.id, userName: item.name })}
          >
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
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
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
  meta: { fontSize: 12.5, color: colors.sub, marginTop: 2 },
  empty: { textAlign: "center", marginTop: 40, color: colors.faint, paddingHorizontal: 24 },
});
