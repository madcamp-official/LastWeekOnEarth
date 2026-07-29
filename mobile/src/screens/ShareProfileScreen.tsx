import React, { useEffect, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PostStackParamList } from "../navigation/postTypes";
import { messagesApi } from "../services/messagesApi";
import { contactsApi } from "../services/contactsApi";
import { useAuthStore } from "../store/useAuthStore";
import { BackButton } from "../components/BackButton";
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<PostStackParamList, "ShareProfile">;

interface ShareEntry {
  id: string;
  name: string;
  affiliation: string | null;
  photoUrl: string | null;
  isMe: boolean;
}

// 상대방에게 "내 프로필"뿐 아니라, 내 주소록에 있는 모든 인맥(계정 있는/없는 사람 모두)을
// 소개해줄 수 있게 목록에서 골라 공유한다. 계정 없는 인맥은 sharedContactId로, 계정 있는
// 나 자신은 sharedProfileId로 보낸다.
export function ShareProfileScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const myUser = useAuthStore((s) => s.user);
  const { userName } = route.params;
  const [contacts, setContacts] = useState<ShareEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    contactsApi
      .list()
      .then((list) =>
        setContacts(
          list.map((c) => ({ id: c.id, name: c.name, affiliation: c.affiliation, photoUrl: c.photoUrl, isMe: false })),
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const entries: ShareEntry[] = myUser
    ? [
        {
          id: myUser.id,
          name: myUser.name,
          affiliation: myUser.affiliation ?? null,
          photoUrl: myUser.avatarUrl ?? null,
          isMe: true,
        },
        ...contacts,
      ]
    : contacts;

  const handleShare = async (entry: ShareEntry) => {
    setSendingId(entry.id);
    try {
      const { userId: partnerId } = route.params;
      await messagesApi.send(partnerId, entry.isMe ? { sharedProfileId: entry.id } : { sharedContactId: entry.id });
      navigation.goBack();
    } finally {
      setSendingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <View>
          <Text style={styles.title}>프로필 공유</Text>
          <Text style={styles.subtitle}>{userName}님에게 소개할 사람을 골라주세요</Text>
        </View>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight }]}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? "" : "공유할 수 있는 인맥이 없습니다."}</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => handleShare(item)} disabled={sendingId !== null}>
            <View style={styles.avatar}>
              {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{item.name[0] ?? "?"}</Text>
              )}
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>
                {item.name}
                {item.isMe ? " (나)" : ""}
              </Text>
              {item.affiliation ? <Text style={styles.meta}>{item.affiliation}</Text> : null}
            </View>
            {sendingId === item.id && <Text style={styles.sending}>보내는 중...</Text>}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: 18, fontWeight: "800", color: colors.ink },
  subtitle: { fontSize: 12, color: colors.sub, marginTop: 2 },
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
  sending: { fontSize: 12, color: colors.violet },
  empty: { textAlign: "center", marginTop: 40, color: colors.faint },
});
