import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MailStackParamList } from "../navigation/mailTypes";
import { contactsApi, type Contact } from "../services/contactsApi";
import { groupsApi, type ContactGroup } from "../services/groupsApi";
import { mailApi, type MailChannel } from "../services/mailApi";

type Props = NativeStackScreenProps<MailStackParamList, "ComposeMail">;
type RecipientMode = "CONTACT" | "GROUP";

const OTHER = "기타";
const OCCASIONS = ["경조사", "안부 인사", "명절 인사", "생일 축하", "감사 인사", "축하 인사", OTHER];
const RECIPIENT_TYPES = ["교수님", "동기", "선배", "후배", "VC 심사역", "채용 담당자", OTHER];
const CHANNELS: { label: string; value: MailChannel }[] = [
  { label: "이메일", value: "EMAIL" },
  { label: "문자", value: "TEXT" },
];

function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.error) {
    return err.response.data.error;
  }
  return fallback;
}

export function ComposeMailScreen({ navigation }: Props) {
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("CONTACT");

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactQuery, setContactQuery] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [occasion, setOccasion] = useState<string | null>(null);
  const [occasionOther, setOccasionOther] = useState("");
  const [recipientType, setRecipientType] = useState<string | null>(null);
  const [recipientTypeOther, setRecipientTypeOther] = useState("");
  const [channel, setChannel] = useState<MailChannel>("EMAIL");
  const [subject, setSubject] = useState("");
  const [generating, setGenerating] = useState(false);

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      setContacts(await contactsApi.list());
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      setGroups(await groupsApi.list());
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  // 마운트 시 한 번만 부르면, 메일 탭에 먼저 들어갔다가 나중에 인맥을 등록한 경우
  // (탭은 화면 언마운트 없이 유지되므로) 새로 등록한 인맥이 캐시된 목록에 없어 안 보였다.
  // 화면에 들어올 때마다 다시 불러오도록 바꾼다.
  useFocusEffect(
    useCallback(() => {
      loadContacts();
      loadGroups();
    }, [loadContacts, loadGroups]),
  );

  const filteredContacts = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.affiliation ?? "").toLowerCase().includes(q),
    );
  }, [contacts, contactQuery]);

  const selectedContact = contacts.find((c) => c.id === selectedContactId);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const resolvedOccasion = occasion === OTHER ? occasionOther.trim() : occasion;
  const resolvedRecipientType = recipientType === OTHER ? recipientTypeOther.trim() : recipientType;

  const handleGenerate = async () => {
    if (recipientMode === "CONTACT" && !selectedContactId) {
      Alert.alert("받는 사람을 선택해주세요.");
      return;
    }
    if (recipientMode === "GROUP" && !selectedGroupId) {
      Alert.alert("그룹을 선택해주세요.");
      return;
    }
    if (!resolvedOccasion) {
      Alert.alert(occasion === OTHER ? "연락 상황을 직접 입력해주세요." : "연락 상황을 선택해주세요.");
      return;
    }
    if (!resolvedRecipientType) {
      Alert.alert(recipientType === OTHER ? "받는 사람 유형을 직접 입력해주세요." : "받는 사람 유형을 선택해주세요.");
      return;
    }

    setGenerating(true);
    try {
      if (recipientMode === "CONTACT") {
        const draft = await mailApi.generate({
          contactId: selectedContactId!,
          occasion: resolvedOccasion,
          recipientType: resolvedRecipientType,
          channel,
          subject: channel === "EMAIL" ? subject.trim() || undefined : undefined,
        });
        navigation.replace("MailDraftDetail", { draftId: draft.id });
      } else {
        const drafts = await mailApi.batchGenerate({
          groupId: selectedGroupId!,
          occasion: resolvedOccasion,
          recipientType: resolvedRecipientType,
          channel,
          subject: channel === "EMAIL" ? subject.trim() || undefined : undefined,
        });
        Alert.alert("생성 완료", `${drafts.length}개의 초안이 생성되었습니다.`, [
          { text: "확인", onPress: () => navigation.navigate("MailList") },
        ]);
      }
    } catch (err) {
      Alert.alert("초안 생성 실패", getErrorMessage(err, "AI 초안을 생성하지 못했습니다."));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={recipientMode === "CONTACT" && !selectedContactId ? filteredContacts : []}
        keyExtractor={(item) => item.id}
        refreshing={recipientMode === "CONTACT" ? loadingContacts : loadingGroups}
        onRefresh={recipientMode === "CONTACT" ? loadContacts : loadGroups}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <Text style={styles.label}>받는 대상</Text>
            <View style={styles.chipRow}>
              <Pressable
                style={[styles.chip, recipientMode === "CONTACT" && styles.chipActive]}
                onPress={() => setRecipientMode("CONTACT")}
              >
                <Text style={[styles.chipText, recipientMode === "CONTACT" && styles.chipTextActive]}>
                  받는 사람
                </Text>
              </Pressable>
              <Pressable
                style={[styles.chip, recipientMode === "GROUP" && styles.chipActive]}
                onPress={() => setRecipientMode("GROUP")}
              >
                <Text style={[styles.chipText, recipientMode === "GROUP" && styles.chipTextActive]}>그룹</Text>
              </Pressable>
            </View>

            {recipientMode === "CONTACT" ? (
              selectedContact ? (
                <View style={styles.selectedBox}>
                  <Text style={styles.selectedBoxText}>{selectedContact.name} 선택됨</Text>
                  <Pressable onPress={() => setSelectedContactId(null)}>
                    <Text style={styles.clearLink}>변경</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.searchBox}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="이름, 소속 검색"
                    value={contactQuery}
                    onChangeText={setContactQuery}
                    autoCapitalize="none"
                  />
                </View>
              )
            ) : (
              <View style={styles.groupList}>
                {groups.length === 0 ? (
                  <Text style={styles.empty}>만든 그룹이 없습니다.</Text>
                ) : (
                  groups.map((group) => (
                    <Pressable
                      key={group.id}
                      style={[styles.groupRow, selectedGroupId === group.id && styles.groupRowActive]}
                      onPress={() => setSelectedGroupId(group.id)}
                    >
                      <Text style={styles.contactName}>{group.name}</Text>
                      <Text style={styles.contactMeta}>{group.memberCount}명</Text>
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.contactRow} onPress={() => setSelectedContactId(item.id)}>
            <Text style={styles.contactName}>{item.name}</Text>
            <Text style={styles.contactMeta}>{item.affiliation ?? "-"}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          recipientMode === "CONTACT" && !selectedContactId ? (
            <Text style={styles.empty}>등록된 인맥이 없습니다.</Text>
          ) : null
        }
        ListFooterComponent={
          <View style={styles.footerSection}>
            {channel === "EMAIL" && (
              <>
                <Text style={styles.label}>제목 (선택)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="비워두면 AI가 알아서 지어줍니다"
                  value={subject}
                  onChangeText={setSubject}
                />
              </>
            )}

            <Text style={styles.label}>연락 상황</Text>
            <View style={styles.chipRow}>
              {OCCASIONS.map((item) => (
                <Pressable
                  key={item}
                  style={[styles.chip, occasion === item && styles.chipActive]}
                  onPress={() => setOccasion(item)}
                >
                  <Text style={[styles.chipText, occasion === item && styles.chipTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </View>
            {occasion === OTHER && (
              <TextInput
                style={styles.input}
                placeholder="연락 상황을 입력해주세요"
                value={occasionOther}
                onChangeText={setOccasionOther}
              />
            )}

            <Text style={styles.label}>받는 사람 유형</Text>
            <View style={styles.chipRow}>
              {RECIPIENT_TYPES.map((item) => (
                <Pressable
                  key={item}
                  style={[styles.chip, recipientType === item && styles.chipActive]}
                  onPress={() => setRecipientType(item)}
                >
                  <Text style={[styles.chipText, recipientType === item && styles.chipTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </View>
            {recipientType === OTHER && (
              <TextInput
                style={styles.input}
                placeholder="받는 사람 유형을 입력해주세요"
                value={recipientTypeOther}
                onChangeText={setRecipientTypeOther}
              />
            )}

            <Text style={styles.label}>연락 방법</Text>
            <View style={styles.chipRow}>
              {CHANNELS.map((item) => (
                <Pressable
                  key={item.value}
                  style={[styles.chip, channel === item.value && styles.chipActive]}
                  onPress={() => setChannel(item.value)}
                >
                  <Text style={[styles.chipText, channel === item.value && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.generateButton} onPress={handleGenerate} disabled={generating}>
              {generating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.generateButtonText}>AI로 초안 생성</Text>
              )}
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSection: { padding: 16, paddingBottom: 8, gap: 8 },
  footerSection: { padding: 16, gap: 8 },
  label: { fontWeight: "700", marginTop: 12, marginBottom: 4 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F2F2F2",
  },
  searchIcon: { marginRight: 8, fontSize: 14 },
  searchInput: { flex: 1, height: "100%" },
  selectedBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: "#111",
  },
  selectedBoxText: { fontWeight: "600" },
  clearLink: { color: "#4285F4", fontWeight: "600", fontSize: 12 },
  groupList: { gap: 4 },
  groupRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  groupRowActive: { borderColor: "#111", backgroundColor: "#F7F7F7" },
  contactRow: {
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  contactName: { fontWeight: "600" },
  contactMeta: { color: "#888", marginTop: 2, fontSize: 12 },
  empty: { textAlign: "center", marginTop: 24, color: "#999" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: "#ddd", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: "#111", borderColor: "#111" },
  chipText: { color: "#111", fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginTop: 8 },
  generateButton: {
    marginTop: 20,
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  generateButtonText: { color: "#fff", fontWeight: "700" },
});
