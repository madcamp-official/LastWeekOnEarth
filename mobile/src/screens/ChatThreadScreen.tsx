import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PostStackParamList } from "../navigation/postTypes";
import { messagesApi, type Message } from "../services/messagesApi";
import { useAuthStore } from "../store/useAuthStore";
import { BackButton } from "../components/BackButton";
import { SendIcon, PhotoIcon, ProfileCardIcon } from "../components/Icon";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<PostStackParamList, "ChatThread">;

export function ChatThreadScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const myUserId = useAuthStore((s) => s.user?.id);
  const { userId, userName, postId, initialMessage } = route.params;
  const [thread, setThread] = useState<Message[]>([]);
  const [draft, setDraft] = useState(initialMessage ?? "");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const messages = await messagesApi.getThread(userId);
    setThread(messages);
    await messagesApi.markRead(userId);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const message = await messagesApi.send(userId, { content, postId });
      setThread((prev) => [...prev, message]);
      setDraft("");
    } finally {
      setSending(false);
    }
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("사진 접근 권한이 필요합니다.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    setSending(true);
    try {
      const message = await messagesApi.send(userId, {
        photoUrl: `data:image/jpeg;base64,${result.assets[0].base64}`,
      });
      setThread((prev) => [...prev, message]);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>{userName}</Text>
      </View>

      <FlatList
        data={thread}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.bubbleRow, item.senderId === myUserId ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
            <View style={{ maxWidth: "78%" }}>
              {item.post && (
                <View style={styles.quote}>
                  <Text style={styles.quoteLabel}>소식에 답장</Text>
                  <Text style={styles.quoteContent} numberOfLines={2}>
                    {item.post.content}
                  </Text>
                </View>
              )}

              {item.sharedProfile ? (
                <View style={styles.profileCard}>
                  <View style={styles.profileAvatar}>
                    {item.sharedProfile.avatarUrl ? (
                      <Image source={{ uri: item.sharedProfile.avatarUrl }} style={styles.profileAvatarImage} />
                    ) : (
                      <Text style={styles.profileAvatarText}>{item.sharedProfile.name[0] ?? "?"}</Text>
                    )}
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{item.sharedProfile.name}</Text>
                    {item.sharedProfile.affiliation ? (
                      <Text style={styles.profileMeta}>{item.sharedProfile.affiliation}</Text>
                    ) : null}
                  </View>
                </View>
              ) : item.sharedContact ? (
                <View style={styles.profileCard}>
                  <View style={styles.profileAvatar}>
                    {item.sharedContact.photoUrl ? (
                      <Image source={{ uri: item.sharedContact.photoUrl }} style={styles.profileAvatarImage} />
                    ) : (
                      <Text style={styles.profileAvatarText}>{item.sharedContact.name[0] ?? "?"}</Text>
                    )}
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{item.sharedContact.name}</Text>
                    {item.sharedContact.affiliation ? (
                      <Text style={styles.profileMeta}>{item.sharedContact.affiliation}</Text>
                    ) : null}
                  </View>
                </View>
              ) : item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={styles.photoBubble} />
              ) : (
                <View style={[styles.bubble, item.senderId === myUserId ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={item.senderId === myUserId ? styles.bubbleTextMine : styles.bubbleTextTheirs}>
                    {item.content}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      />

      <View style={[styles.inputRow, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable style={styles.attachButton} onPress={handlePickPhoto} disabled={sending} hitSlop={8}>
          <PhotoIcon size={18} color={colors.violet} />
        </Pressable>
        <Pressable
          style={styles.attachButton}
          onPress={() => navigation.navigate("ShareProfile", { userId, userName })}
          disabled={sending}
          hitSlop={8}
        >
          <ProfileCardIcon size={18} color={colors.violet} />
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder="메시지 보내기..."
          placeholderTextColor={colors.faint}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={handleSend}
          multiline
        />
        <Pressable style={styles.sendButton} onPress={handleSend} disabled={sending} hitSlop={8}>
          <SendIcon size={18} color={colors.violet} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: 18, fontWeight: "800", color: colors.ink },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: 8 },
  bubbleRow: { flexDirection: "row" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleRowTheirs: { justifyContent: "flex-start" },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg },
  bubbleMine: { backgroundColor: colors.violet, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 4 },
  bubbleTextMine: { color: "#fff", fontSize: 14, lineHeight: 19 },
  bubbleTextTheirs: { color: colors.ink, fontSize: 14, lineHeight: 19 },
  photoBubble: { width: 200, height: 200, borderRadius: radius.lg },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.violet,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileAvatarImage: { width: 40, height: 40 },
  profileAvatarText: { color: "#fff", fontWeight: "700" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 14, fontWeight: "700", color: colors.ink },
  profileMeta: { fontSize: 12, color: colors.sub, marginTop: 2 },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.violet,
    backgroundColor: colors.violetSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
  },
  quoteLabel: { fontSize: 10.5, fontWeight: "700", color: colors.violet, marginBottom: 2 },
  quoteContent: { fontSize: 12, color: colors.sub },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  attachButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.bg,
    maxHeight: 100,
  },
  sendButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
});
