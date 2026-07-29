import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PostStackParamList } from "../navigation/postTypes";
import { messagesApi, type Message } from "../services/messagesApi";
import { contactsApi } from "../services/contactsApi";
import { getSocket } from "../services/socket";
import { useAuthStore } from "../store/useAuthStore";
import { BackButton } from "../components/BackButton";
import { SendIcon, PhotoIcon, ProfileCardIcon } from "../components/Icon";
import { SolidButtonView } from "../components/SolidButtonView";
import { ImageViewerModal } from "../components/ImageViewerModal";
import { useFocusedInterval } from "../hooks/useFocusedInterval";
import { confirmPositive, notify } from "../utils/confirm";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<PostStackParamList, "ChatThread">;

export function ChatThreadScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const myUserId = useAuthStore((s) => s.user?.id);
  const { userId, userName, postId, initialMessage } = route.params;
  const [thread, setThread] = useState<Message[]>([]);
  const [draft, setDraft] = useState(initialMessage ?? "");
  const [sending, setSending] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  // FlatList를 inverted로 뒤집어서 "최신 메시지가 보이는 상태" = "스크롤 오프셋 0"이 되도록
  // 한다 — 그러면 키보드가 열려 리스트가 작아지거나 새 메시지가 도착해도 오프셋을 다시 계산해서
  // 억지로 스크롤할 필요가 없다(기존 위치를 그대로 유지하는 것이 곧 "최신을 보여주는 것"이 됨).
  const reversedThread = useMemo(() => [...thread].reverse(), [thread]);
  // 공유받은 프로필이 이미 내 인맥에 등록돼 있으면 "눌러서 등록" 안내 대신 "이미 등록됨"을 보여준다.
  const [registeredUserIds, setRegisteredUserIds] = useState<Set<string>>(new Set());

  const loadRegisteredContacts = useCallback(async () => {
    const contacts = await contactsApi.list();
    setRegisteredUserIds(new Set(contacts.map((c) => c.targetUserId).filter((id): id is string => Boolean(id))));
  }, []);

  useEffect(() => {
    loadRegisteredContacts();
  }, [loadRegisteredContacts]);

  const load = useCallback(async () => {
    const messages = await messagesApi.getThread(userId);
    setThread(messages);
    await messagesApi.markRead(userId);
  }, [userId]);

  // 소켓이 끊기거나 지연될 때를 대비한 안전망 폴링 — 평소엔 아래 소켓 리스너가 즉시 반영해준다.
  useFocusedInterval(load, 15000);

  const scrollToLatest = () => {
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
  };

  // 상대가 이 대화방으로 보낸 메시지를 실시간으로 받아 바로 말풍선 목록에 붙인다.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      if (message.senderId !== userId) return;
      setThread((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      messagesApi.markRead(userId);
      scrollToLatest();
    };

    socket.on("message:new", handleNewMessage);
    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [userId]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const message = await messagesApi.send(userId, { content, postId });
      setThread((prev) => [...prev, message]);
      setDraft("");
      scrollToLatest();
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
      allowsEditing: true,
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
      scrollToLatest();
    } finally {
      setSending(false);
    }
  };

  // 계정이 있는 상대(sharedProfile)는 BLE 태깅과 동일한 등록 API를 재사용한다.
  const handleRegisterProfile = (profile: { id: string; name: string }) => {
    if (registeredUserIds.has(profile.id)) {
      notify("이미 등록된 인맥입니다.");
      return;
    }
    confirmPositive(`${profile.name}님을 인맥으로 등록할까요?`, async () => {
      try {
        await contactsApi.addFromIncoming(profile.id);
        setRegisteredUserIds((prev) => new Set(prev).add(profile.id));
        notify("등록 완료", `${profile.name}님을 인맥으로 등록했습니다.`);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          setRegisteredUserIds((prev) => new Set(prev).add(profile.id));
          notify("이미 등록된 인맥입니다.");
          return;
        }
        notify("등록 실패", "잠시 후 다시 시도해주세요.");
      }
    }, "등록");
  };

  // 계정이 없는 상대(sharedContact)는 이름/소속/사진 스냅샷을 그대로 내 주소록에 새로 만든다.
  const handleRegisterContact = (contact: { name: string; affiliation: string | null; photoUrl: string | null }) => {
    confirmPositive(`${contact.name}님을 인맥으로 등록할까요?`, async () => {
      try {
        await contactsApi.create({
          name: contact.name,
          affiliation: contact.affiliation,
          photoUrl: contact.photoUrl,
        });
        notify("등록 완료", `${contact.name}님을 인맥으로 등록했습니다.`);
      } catch {
        notify("등록 실패", "잠시 후 다시 시도해주세요.");
      }
    }, "등록");
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>{userName}</Text>
      </View>

      <KeyboardAvoidingView style={styles.flexArea} behavior="translate-with-padding">
      <FlatList
        ref={listRef}
        style={styles.flexArea}
        data={reversedThread}
        inverted
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.bubbleRow, item.senderId === myUserId ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
            <View style={{ maxWidth: "78%" }}>
              {item.post && (
                <Pressable
                  style={styles.quote}
                  onPress={() => navigation.navigate("PostDetail", { postId: item.post!.id })}
                >
                  <Text style={styles.quoteLabel}>소식에 답장</Text>
                  <Text style={styles.quoteContent} numberOfLines={2}>
                    {item.post.content}
                  </Text>
                </Pressable>
              )}

              {item.sharedProfile ? (
                <Pressable
                  style={styles.profileCard}
                  disabled={item.senderId === myUserId}
                  onPress={() => handleRegisterProfile(item.sharedProfile!)}
                >
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
                    {item.senderId !== myUserId ? (
                      registeredUserIds.has(item.sharedProfile.id) ? (
                        <Text style={styles.profileHintDone}>이미 등록된 인맥</Text>
                      ) : (
                        <Text style={styles.profileHint}>눌러서 인맥으로 등록</Text>
                      )
                    ) : null}
                  </View>
                </Pressable>
              ) : item.sharedContact ? (
                <Pressable
                  style={styles.profileCard}
                  disabled={item.senderId === myUserId}
                  onPress={() => handleRegisterContact(item.sharedContact!)}
                >
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
                    {item.senderId !== myUserId ? <Text style={styles.profileHint}>눌러서 인맥으로 등록</Text> : null}
                  </View>
                </Pressable>
              ) : item.photoUrl ? (
                <Pressable onPress={() => setViewerUri(item.photoUrl)}>
                  <Image source={{ uri: item.photoUrl }} style={styles.photoBubble} />
                </Pressable>
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

      <View style={styles.inputRow}>
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
          returnKeyType="send"
        />
        <Pressable onPress={handleSend} disabled={sending} hitSlop={8}>
          <SolidButtonView style={styles.sendButton} borderRadius={radius.md}>
            <SendIcon size={18} color="#fff" />
          </SolidButtonView>
        </Pressable>
      </View>
      </KeyboardAvoidingView>

      <ImageViewerModal uri={viewerUri} onClose={() => setViewerUri(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flexArea: { flex: 1 },
  // 키보드가 열려 있는 동안 아래 KeyboardAvoidingView(translate-with-padding)의 내부 래퍼가
  // 화면 영역을 넘어 헤더 쪽까지 터치를 가로채는 경우가 있어, 헤더가 항상 위에서 터치를
  // 받도록 z축을 명시적으로 올려둔다.
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    zIndex: 10,
    elevation: 10,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  // inverted 리스트라 paddingTop이 화면상으로는 입력 바 바로 위(시각적 하단) 여백이 된다.
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: 8 },
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
    alignSelf: "flex-start",
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.sm,
    maxWidth: "100%",
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
  profileInfo: { flexShrink: 1 },
  profileName: { fontSize: 14, fontWeight: "700", color: colors.ink },
  profileMeta: { fontSize: 12, color: colors.sub, marginTop: 2 },
  profileHint: { fontSize: 11, color: colors.violet, fontWeight: "600", marginTop: 4 },
  profileHintDone: { fontSize: 11, color: colors.faint, fontWeight: "600", marginTop: 4 },
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
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
    height: 38,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 14,
    textAlignVertical: "center",
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  sendButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
});
