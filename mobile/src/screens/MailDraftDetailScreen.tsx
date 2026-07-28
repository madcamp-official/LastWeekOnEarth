import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import axios from "axios";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MailStackParamList } from "../navigation/mailTypes";
import { mailApi, type MailDraft } from "../services/mailApi";
import { gmailApi } from "../services/gmailApi";
import { confirmAction, notify } from "../utils/confirm";
import { KeyboardAvoidingScreen } from "../components/KeyboardAvoidingScreen";
import { SolidButtonView } from "../components/SolidButtonView";
import { colors, radius, spacing } from "../theme/colors";

const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];
const DATE_CHOICE_DAYS = 14;

function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function buildDateChoices(): Date[] {
  const today = dateOnly(new Date());
  return Array.from({ length: DATE_CHOICE_DAYS }, (_, i) => new Date(today.getTime() + i * 24 * 60 * 60 * 1000));
}

function formatDateChoiceLabel(d: Date, index: number): string {
  if (index === 0) return "오늘";
  if (index === 1) return "내일";
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAY_LABEL[d.getDay()]})`;
}

// 정시/30분 단위 시간 슬롯 (00:00 ~ 23:30, 48개).
function buildTimeSlots(): { hour: number; minute: number; label: string }[] {
  const slots: { hour: number; minute: number; label: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      slots.push({ hour, minute, label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` });
    }
  }
  return slots;
}

function extractErrorMessage(err: unknown): string {
  return axios.isAxiosError(err) && err.response?.data?.error ? err.response.data.error : "요청 처리 중 오류가 발생했습니다.";
}

type Props = NativeStackScreenProps<MailStackParamList, "MailDraftDetail">;

export function MailDraftDetailScreen({ route, navigation }: Props) {
  const { draftId } = route.params;
  const [draft, setDraft] = useState<MailDraft | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  // 마지막으로 서버에 저장(또는 처음 로드)된 값. subject/body와 비교해 변경 여부를 판단한다.
  const [savedSubject, setSavedSubject] = useState("");
  const [savedBody, setSavedBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const dateChoices = useMemo(buildDateChoices, []);
  const timeSlots = useMemo(buildTimeSlots, []);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);

  const isDirty = subject !== savedSubject || body !== savedBody;

  const load = useCallback(async () => {
    const result = await mailApi.get(draftId);
    setDraft(result);
    setSubject(result.subject);
    setBody(result.body);
    setSavedSubject(result.subject);
    setSavedBody(result.body);
  }, [draftId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleCopy = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert(`${label}이(가) 복사되었습니다.`);
  };

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      const updated = await mailApi.update(draftId, { subject, body });
      setDraft(updated);
      setSubject(updated.subject);
      setBody(updated.body);
      setSavedSubject(updated.subject);
      setSavedBody(updated.body);
      Alert.alert("저장되었습니다.");
    } catch {
      Alert.alert("저장 실패", "초안을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    confirmAction("이 초안을 삭제하시겠습니까?", async () => {
      await mailApi.remove(draftId);
      navigation.goBack();
    });
  };

  // 발송/예약 전에 편집 중인 내용이 있으면 먼저 저장해 최신 내용으로 보내지도록 한다.
  const saveIfDirty = async () => {
    if (!isDirty) return;
    const updated = await mailApi.update(draftId, { subject, body });
    setDraft(updated);
    setSavedSubject(updated.subject);
    setSavedBody(updated.body);
  };

  // Gmail 미연동 상태(400)면 동의 화면을 열어주고, 사용자가 승인 후 돌아오면 다시 시도하게 안내한다.
  const promptGmailConnect = async () => {
    try {
      const { consentUrl } = await gmailApi.connect();
      // expo-web-browser의 openBrowserAsync는 web에서 지원되지 않아(안드로이드 전용) Linking으로 연다.
      if (Platform.OS === "web") {
        await Linking.openURL(consentUrl);
      } else {
        await WebBrowser.openBrowserAsync(consentUrl);
      }
      notify("Gmail 연동 완료 후 다시 시도해주세요.");
    } catch (err) {
      notify("Gmail 연동 실패", extractErrorMessage(err));
    }
  };

  const handleSendNow = () => {
    confirmAction(
      "지금 이 이메일을 발송할까요?",
      async () => {
        setSending(true);
        try {
          await saveIfDirty();
          const result = await mailApi.send(draftId);
          setDraft(result);
          notify("발송 완료", "메일이 발송되었습니다.");
        } catch (err) {
          const message = extractErrorMessage(err);
          if (message.includes("Gmail 발송 권한")) {
            await promptGmailConnect();
          } else {
            notify("발송 실패", message);
          }
        } finally {
          setSending(false);
        }
      },
      "발송",
    );
  };

  const handleSelectTimeSlot = (hour: number, minute: number) => {
    const base = dateChoices[selectedDateIndex];
    const scheduledAt = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, minute, 0, 0);
    if (scheduledAt.getTime() <= Date.now()) return;
    handleSchedule(scheduledAt);
  };

  const handleSchedule = async (scheduledAt: Date) => {
    setScheduleModalVisible(false);
    setSending(true);
    try {
      await saveIfDirty();
      const updated = await mailApi.schedule(draftId, scheduledAt);
      setDraft(updated);
      notify("예약 완료", `${scheduledAt.toLocaleString()}에 자동으로 발송돼요.`);
    } catch (err) {
      notify("예약 실패", extractErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!draft || draft.channel !== "EMAIL") {
      navigation.setOptions({ headerRight: undefined });
      return;
    }

    navigation.setOptions({
      headerRight: () =>
        sending ? (
          <ActivityIndicator style={styles.headerSpinner} />
        ) : draft.status === "SENT" ? null : (
          <View style={styles.headerActions}>
            <Pressable onPress={() => setScheduleModalVisible(true)} hitSlop={8}>
              <Text style={styles.headerActionText}>예약하기</Text>
            </Pressable>
            <Pressable onPress={handleSendNow} hitSlop={8}>
              <Text style={[styles.headerActionText, styles.headerActionPrimary]}>발송하기</Text>
            </Pressable>
          </View>
        ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, sending, subject, body, isDirty]);

  if (!draft) return null;

  return (
    <KeyboardAvoidingScreen>
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.contactName}>
          {draft.contact?.name ?? (draft.group ? `${draft.group.name} (그룹 공통)` : "삭제된 인맥")}
        </Text>
        <View style={styles.channelBadge}>
          <Text style={styles.channelBadgeText}>{draft.channel === "EMAIL" ? "이메일" : "문자"}</Text>
        </View>
      </View>
      {draft.status === "SENT" && <Text style={styles.statusSent}>발송 완료</Text>}
      {draft.status === "SCHEDULED" && draft.scheduledAt && (
        <Text style={styles.statusScheduled}>{new Date(draft.scheduledAt).toLocaleString()}에 예약 발송 예정</Text>
      )}
      {draft.contact?.affiliation ? <Text style={styles.meta}>{draft.contact.affiliation}</Text> : null}
      {draft.group ? <Text style={styles.meta}>그룹 전체에게 동일하게 발송할 공통 초안이에요.</Text> : null}

      {draft.channel === "EMAIL" && (
        <>
          <View style={styles.labelRow}>
            <Text style={styles.label}>제목</Text>
            <Pressable onPress={() => handleCopy(subject, "제목")} hitSlop={8}>
              <Text style={styles.copyLink}>복사</Text>
            </Pressable>
          </View>
          <TextInput style={styles.input} value={subject} onChangeText={setSubject} />
        </>
      )}

      <View style={styles.labelRow}>
        <Text style={styles.label}>본문</Text>
        <Pressable onPress={() => handleCopy(body, "본문")} hitSlop={8}>
          <Text style={styles.copyLink}>복사</Text>
        </Pressable>
      </View>
      <TextInput
        style={[styles.input, styles.bodyInput]}
        value={body}
        onChangeText={setBody}
        multiline
        textAlignVertical="top"
      />

      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.danger]} onPress={handleDelete}>
          <Text style={styles.buttonText}>삭제</Text>
        </Pressable>
        <Pressable style={styles.buttonFlex} onPress={handleSave} disabled={saving || !isDirty}>
          {saving || !isDirty ? (
            <View style={[styles.button, styles.buttonDisabled]}>
              <Text style={styles.buttonText}>{saving ? "저장 중..." : "저장"}</Text>
            </View>
          ) : (
            <SolidButtonView style={styles.button} borderRadius={radius.md}>
              <Text style={styles.buttonText}>저장</Text>
            </SolidButtonView>
          )}
        </Pressable>
      </View>

      <Modal
        visible={scheduleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setScheduleModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setScheduleModalVisible(false)}>
          <Pressable style={styles.modalCardWide} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>언제 발송할까요?</Text>

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={dateChoices}
              keyExtractor={(d) => d.toISOString()}
              contentContainerStyle={styles.dateChipsRow}
              renderItem={({ item, index }) => {
                const active = index === selectedDateIndex;
                return (
                  <Pressable onPress={() => setSelectedDateIndex(index)}>
                    {active ? (
                      <SolidButtonView style={styles.dateChip} borderRadius={radius.pill}>
                        <Text style={styles.dateChipTextActive}>{formatDateChoiceLabel(item, index)}</Text>
                      </SolidButtonView>
                    ) : (
                      <View style={[styles.dateChip, styles.dateChipInactive]}>
                        <Text style={styles.dateChipText}>{formatDateChoiceLabel(item, index)}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              }}
            />

            <FlatList
              data={timeSlots}
              keyExtractor={(slot) => slot.label}
              numColumns={4}
              style={styles.timeGrid}
              renderItem={({ item }) => {
                const base = dateChoices[selectedDateIndex];
                const slotDate = new Date(base.getFullYear(), base.getMonth(), base.getDate(), item.hour, item.minute, 0, 0);
                const disabled = slotDate.getTime() <= Date.now();
                return (
                  <Pressable
                    style={[styles.timeSlot, disabled && styles.timeSlotDisabled]}
                    disabled={disabled}
                    onPress={() => handleSelectTimeSlot(item.hour, item.minute)}
                  >
                    <Text style={[styles.timeSlotText, disabled && styles.timeSlotTextDisabled]}>{item.label}</Text>
                  </Pressable>
                );
              }}
            />

            <Pressable style={styles.modalCancel} onPress={() => setScheduleModalVisible(false)}>
              <Text style={styles.modalCancelText}>취소</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  contactName: { fontSize: 20, fontWeight: "800", color: colors.ink },
  meta: { color: colors.sub, marginTop: 4 },
  channelBadge: { backgroundColor: colors.blueSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  channelBadgeText: { color: colors.blue, fontWeight: "600", fontSize: 12 },
  label: { fontWeight: "700", color: colors.ink },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 6,
  },
  copyLink: { color: colors.violet, fontWeight: "600", fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 12,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  bodyInput: { minHeight: 200 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: 24, marginBottom: 32 },
  button: { borderRadius: radius.md, padding: 12, alignItems: "center" },
  buttonFlex: { flex: 1 },
  buttonDisabled: { backgroundColor: colors.faint },
  danger: { flex: 1, backgroundColor: colors.danger },
  buttonText: { color: "#fff", fontWeight: "600" },
  statusSent: { color: colors.blue, fontWeight: "700", marginTop: 6 },
  statusScheduled: { color: colors.violet, fontWeight: "700", marginTop: 6 },
  headerActions: { flexDirection: "row", gap: spacing.md, paddingRight: Platform.OS === "ios" ? 0 : spacing.sm },
  headerActionText: { color: colors.ink, fontWeight: "600", fontSize: 14 },
  headerActionPrimary: { color: colors.violet, fontWeight: "800" },
  headerSpinner: { marginRight: spacing.sm },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalCard: {
    width: "80%",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalCardWide: {
    width: "92%",
    maxHeight: "80%",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: { fontWeight: "800", fontSize: 16, color: colors.ink, marginBottom: 12 },
  modalOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  modalOptionText: { fontSize: 15, color: colors.ink },
  modalCancel: { paddingVertical: 12, alignItems: "center", marginTop: 4 },
  modalCancelText: { color: colors.sub, fontWeight: "600" },
  dateChipsRow: { gap: spacing.sm, paddingBottom: spacing.sm },
  dateChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  dateChipInactive: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line },
  dateChipText: { fontSize: 13, fontWeight: "600", color: colors.sub },
  dateChipTextActive: { fontSize: 13, fontWeight: "600", color: "#fff" },
  timeGrid: { marginTop: spacing.md, maxHeight: 260 },
  timeSlot: {
    flex: 1,
    margin: 4,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  timeSlotDisabled: { opacity: 0.35 },
  timeSlotText: { fontSize: 13, fontWeight: "600", color: colors.ink },
  timeSlotTextDisabled: { color: colors.faint },
});
