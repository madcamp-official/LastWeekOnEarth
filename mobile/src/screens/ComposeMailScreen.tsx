import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import axios from "axios";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MailStackParamList } from "../navigation/mailTypes";
import { contactsApi, type Contact } from "../services/contactsApi";
import { groupsApi, type ContactGroup } from "../services/groupsApi";
import { mailApi, type GroupDraftMode, type MailChannel } from "../services/mailApi";

type Props = NativeStackScreenProps<MailStackParamList, "ComposeMail">;
type RecipientMode = "CONTACT" | "GROUP";

const OTHER = "기타";
const OCCASIONS = ["경조사", "안부 인사", "명절 인사", "생일 축하", "감사 인사", "축하 인사", OTHER];
const RECIPIENT_TYPES = ["교수님", "동기", "선배", "후배", "VC 심사역", "채용 담당자", OTHER];
const CHANNELS: { label: string; value: MailChannel }[] = [
  { label: "이메일", value: "EMAIL" },
  { label: "문자", value: "TEXT" },
];
const GROUP_DRAFT_MODES: { label: string; value: GroupDraftMode }[] = [
  { label: "공통 초안 1개", value: "SHARED" },
  { label: "구성원별 개별 초안", value: "PER_MEMBER" },
];

// 축하 대상을 추가로 골라야 하는 상황인지 (백엔드 isCelebrationOccasion과 동일 기준).
function isCelebrationOccasion(occasion: string | null): boolean {
  if (!occasion) return false;
  return occasion.includes("축하") || occasion.includes("생일");
}

// 생일은 축하 사유가 이미 분명하므로 별도 상세 입력을 받지 않는다.
function requiresCelebrationDetail(occasion: string | null): boolean {
  return isCelebrationOccasion(occasion) && !occasion?.includes("생일");
}

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
  const [groupDraftMode, setGroupDraftMode] = useState<GroupDraftMode>("SHARED");
  const [groupMembers, setGroupMembers] = useState<Contact[]>([]);
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);
  const [celebrantContactId, setCelebrantContactId] = useState<string | null>(null);

  const [occasion, setOccasion] = useState<string | null>(null);
  const [occasionOther, setOccasionOther] = useState("");
  const [recipientType, setRecipientType] = useState<string | null>(null);
  const [recipientTypeOther, setRecipientTypeOther] = useState("");
  const [channel, setChannel] = useState<MailChannel>("EMAIL");
  const [subject, setSubject] = useState("");
  const [celebrationDetail, setCelebrationDetail] = useState("");
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

  useEffect(() => {
    loadContacts();
    loadGroups();
  }, [loadContacts, loadGroups]);

  // 그룹을 고르면(그리고 선택이 바뀌면) 축하 대상 선택용으로 구성원 목록을 새로 받아온다.
  useEffect(() => {
    setCelebrantContactId(null);
    if (!selectedGroupId) {
      setGroupMembers([]);
      return;
    }
    setLoadingGroupMembers(true);
    groupsApi
      .get(selectedGroupId)
      .then((detail) => setGroupMembers(detail.contacts))
      .finally(() => setLoadingGroupMembers(false));
  }, [selectedGroupId]);

  const filteredContacts = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.affiliation ?? "").toLowerCase().includes(q),
    );
  }, [contacts, contactQuery]);

  const selectedContact = contacts.find((c) => c.id === selectedContactId);
  const selectedCelebrant = groupMembers.find((c) => c.id === celebrantContactId);

  const resolvedOccasion = occasion === OTHER ? occasionOther.trim() : occasion;
  const resolvedRecipientType = recipientType === OTHER ? recipientTypeOther.trim() : recipientType;
  const needsCelebrationDetail = requiresCelebrationDetail(resolvedOccasion);
  const needsCelebrant = isCelebrationOccasion(resolvedOccasion) && recipientMode === "GROUP";

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
    if (needsCelebrationDetail && !celebrationDetail.trim()) {
      Alert.alert("무엇을 축하하는지 입력해주세요.");
      return;
    }
    if (needsCelebrant && !celebrantContactId) {
      Alert.alert("누구를 축하하는지 선택해주세요.");
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
          celebrationDetail: needsCelebrationDetail ? celebrationDetail.trim() : undefined,
        });
        navigation.replace("MailDraftDetail", { draftId: draft.id });
      } else {
        const drafts = await mailApi.batchGenerate({
          groupId: selectedGroupId!,
          occasion: resolvedOccasion,
          recipientType: resolvedRecipientType,
          channel,
          subject: channel === "EMAIL" ? subject.trim() || undefined : undefined,
          celebrationDetail: needsCelebrationDetail ? celebrationDetail.trim() : undefined,
          celebrantContactId: needsCelebrant ? celebrantContactId! : undefined,
          mode: groupDraftMode,
        });
        if (drafts.length === 1) {
          navigation.replace("MailDraftDetail", { draftId: drafts[0].id });
        } else {
          Alert.alert("생성 완료", `${drafts.length}개의 초안이 생성되었습니다.`, [
            { text: "확인", onPress: () => navigation.navigate("MailList") },
          ]);
        }
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
              <>
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

                {selectedGroupId && (
                  <>
                    <Text style={styles.label}>발송 방식</Text>
                    <View style={styles.chipRow}>
                      {GROUP_DRAFT_MODES.map((opt) => (
                        <Pressable
                          key={opt.value}
                          style={[styles.chip, groupDraftMode === opt.value && styles.chipActive]}
                          onPress={() => setGroupDraftMode(opt.value)}
                        >
                          <Text style={[styles.chipText, groupDraftMode === opt.value && styles.chipTextActive]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={styles.hint}>
                      {groupDraftMode === "SHARED"
                        ? "모두에게 똑같이 보낼 초안 1개만 만들어요."
                        : "구성원별로 이름을 넣어 각각 개인화된 초안을 만들어요."}
                    </Text>
                  </>
                )}
              </>
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

            {needsCelebrationDetail && (
              <>
                <Text style={styles.label}>무엇을 축하하나요?</Text>
                <TextInput
                  style={styles.input}
                  placeholder="예: 합격, 취업, 생일, 승진"
                  value={celebrationDetail}
                  onChangeText={setCelebrationDetail}
                />
              </>
            )}

            {needsCelebrant && (
              <>
                <Text style={styles.label}>누구를 축하하나요?</Text>
                {selectedCelebrant ? (
                  <View style={styles.selectedBox}>
                    <Text style={styles.selectedBoxText}>{selectedCelebrant.name} 선택됨</Text>
                    <Pressable onPress={() => setCelebrantContactId(null)}>
                      <Text style={styles.clearLink}>변경</Text>
                    </Pressable>
                  </View>
                ) : loadingGroupMembers ? (
                  <ActivityIndicator color="#111" />
                ) : (
                  <View style={styles.groupList}>
                    {groupMembers.length === 0 ? (
                      <Text style={styles.empty}>그룹에 구성원이 없습니다.</Text>
                    ) : (
                      groupMembers.map((member) => (
                        <Pressable
                          key={member.id}
                          style={styles.groupRow}
                          onPress={() => setCelebrantContactId(member.id)}
                        >
                          <Text style={styles.contactName}>{member.name}</Text>
                          <Text style={styles.contactMeta}>{member.affiliation ?? "-"}</Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                )}
              </>
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
  hint: { color: "#888", fontSize: 12, marginTop: -4 },
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
