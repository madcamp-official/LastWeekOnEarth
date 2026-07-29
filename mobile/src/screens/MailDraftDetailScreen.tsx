import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import axios from "axios";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MailStackParamList } from "../navigation/mailTypes";
import { mailApi, type MailDraft } from "../services/mailApi";
import { gmailApi } from "../services/gmailApi";
import { confirmAction, notify } from "../utils/confirm";
import { BackButton } from "../components/BackButton";
import { KeyboardAvoidingScreen } from "../components/KeyboardAvoidingScreen";
import { SolidButtonView } from "../components/SolidButtonView";
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import { colors, radius, spacing } from "../theme/colors";

function extractErrorMessage(err: unknown): string {
  return axios.isAxiosError(err) && err.response?.data?.error ? err.response.data.error : "요청 처리 중 오류가 발생했습니다.";
}

type Props = NativeStackScreenProps<MailStackParamList, "MailDraftDetail">;

export function MailDraftDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const { draftId } = route.params;
  const [draft, setDraft] = useState<MailDraft | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  // 마지막으로 서버에 저장(또는 처음 로드)된 값. subject/body와 비교해 변경 여부를 판단한다.
  const [savedSubject, setSavedSubject] = useState("");
  const [savedBody, setSavedBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  // iOS는 커스텀 모달 안에 스피너를 그대로 넣어 날짜+시간을 한 화면에서 스크롤로 고르지만,
  // 안드로이드는 이 라이브러리가 datetime 모드를 "날짜 다이얼로그 → 시간 다이얼로그" 두 단계
  // 네이티브 팝업으로 나눠서 처리한다(OS 자체 제약, 라이브러리로 못 합침) — 그래서 안드로이드는
  // 우리 모달을 안 쓰고 이 두 단계를 순서대로 띄운다.
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [androidPickerStage, setAndroidPickerStage] = useState<"date" | "time" | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState(() => new Date(Date.now() + 60 * 60 * 1000));

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
    const isEmail = draft?.channel === "EMAIL";
    confirmAction(
      isEmail ? "지금 이 이메일을 발송할까요?" : "지금 쪽지로 발송할까요?",
      async () => {
        setSending(true);
        try {
          await saveIfDirty();
          const result = await mailApi.send(draftId);
          setDraft(result);
          if (isEmail) {
            if (result.dmSent) {
              notify("발송 완료", "메일이 발송되었고, 쪽지로도 전달했어요.");
            } else if (result.dmSkippedReason) {
              notify("발송 완료", `메일이 발송되었습니다.\n${result.dmSkippedReason}`);
            } else {
              notify("발송 완료", "메일이 발송되었습니다.");
            }
          } else {
            notify("발송 완료", "쪽지로 전달했어요.");
          }
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

  const commitSchedule = async (scheduledAt: Date) => {
    if (scheduledAt.getTime() <= Date.now()) {
      notify("현재 시각보다 이후로 선택해주세요.");
      return;
    }
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

  const openScheduleModal = () => {
    // 이미 예약돼 있으면 그 시각을 그대로 열어서 "바꾸는" 느낌으로, 아니면 1시간 뒤를 기본값으로.
    const initial = draft?.status === "SCHEDULED" && draft.scheduledAt
      ? new Date(draft.scheduledAt)
      : new Date(Date.now() + 60 * 60 * 1000);
    setScheduleDraft(initial);
    if (Platform.OS === "android") {
      setAndroidPickerStage("date");
    } else {
      setScheduleModalVisible(true);
    }
  };

  const handleCancelSchedule = () => {
    confirmAction(
      "예약을 취소할까요?",
      async () => {
        setSending(true);
        try {
          const updated = await mailApi.update(draftId, { status: "DRAFT" });
          setDraft(updated);
          notify("예약이 취소됐어요.");
        } catch (err) {
          notify("예약 취소 실패", extractErrorMessage(err));
        } finally {
          setSending(false);
        }
      },
      "예약 취소",
    );
  };

  const handleIOSConfirm = () => {
    setScheduleModalVisible(false);
    commitSchedule(scheduleDraft);
  };

  const handleAndroidDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setAndroidPickerStage(null);
    if (event.type === "dismissed" || !date) return;
    setScheduleDraft(date);
    setAndroidPickerStage("time");
  };

  const handleAndroidTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    setAndroidPickerStage(null);
    if (event.type === "dismissed" || !date) return;
    const combined = new Date(scheduleDraft);
    combined.setHours(date.getHours(), date.getMinutes(), 0, 0);
    commitSchedule(combined);
  };

  if (!draft) return null;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>초안</Text>
        </View>
        {sending ? (
          <ActivityIndicator color={colors.violet} />
        ) : draft.status === "SENT" ? null : (
          <View style={styles.headerActions}>
            <Pressable onPress={openScheduleModal} hitSlop={8}>
              <Text style={styles.headerActionText}>{draft.status === "SCHEDULED" ? "예약 변경" : "예약"}</Text>
            </Pressable>
            <Pressable onPress={handleSendNow} hitSlop={8}>
              <Text style={[styles.headerActionText, styles.headerActionPrimary]}>발송</Text>
            </Pressable>
          </View>
        )}
      </View>

      <KeyboardAvoidingScreen>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: tabBarHeight }}>
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
          <View style={styles.scheduledRow}>
            <Text style={styles.statusScheduled}>{new Date(draft.scheduledAt).toLocaleString()}에 예약 발송 예정</Text>
            <Pressable onPress={handleCancelSchedule} hitSlop={8}>
              <Text style={styles.cancelScheduleLink}>예약 취소</Text>
            </Pressable>
          </View>
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
          <Pressable style={styles.actionButtonFlex} onPress={handleDelete}>
            <View style={[styles.button, styles.danger]}>
              <Text style={styles.buttonText}>삭제</Text>
            </View>
          </Pressable>
          <Pressable style={styles.actionButtonFlex} onPress={handleSave} disabled={saving || !isDirty}>
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

        {Platform.OS === "ios" && (
          <Modal
            visible={scheduleModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setScheduleModalVisible(false)}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setScheduleModalVisible(false)}>
              <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.modalTitle}>언제 발송할까요?</Text>

                <DateTimePicker
                  value={scheduleDraft}
                  mode="datetime"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={(_event, date) => {
                    if (date) setScheduleDraft(date);
                  }}
                  locale="ko-KR"
                  style={styles.picker}
                />

                <View style={styles.modalActions}>
                  <Pressable style={styles.modalActionFlex} onPress={() => setScheduleModalVisible(false)}>
                    <View style={[styles.modalButton, styles.modalCancelButton]}>
                      <Text style={styles.modalCancelText}>취소</Text>
                    </View>
                  </Pressable>
                  <Pressable style={styles.modalActionFlex} onPress={handleIOSConfirm}>
                    <SolidButtonView style={styles.modalButton} borderRadius={radius.md}>
                      <Text style={styles.modalConfirmText}>예약</Text>
                    </SolidButtonView>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        )}

        {Platform.OS === "android" && androidPickerStage === "date" && (
          <DateTimePicker
            value={scheduleDraft}
            mode="date"
            display="spinner"
            minimumDate={new Date()}
            onChange={handleAndroidDateChange}
          />
        )}
        {Platform.OS === "android" && androidPickerStage === "time" && (
          <DateTimePicker value={scheduleDraft} mode="time" display="spinner" onChange={handleAndroidTimeChange} />
        )}
      </ScrollView>
      </KeyboardAvoidingScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerTitle: { fontSize: 22, fontWeight: "800", color: colors.ink },
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
  actionButtonFlex: { flex: 1 },
  button: { height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  buttonDisabled: { backgroundColor: colors.faint },
  danger: { backgroundColor: colors.danger },
  buttonText: { color: "#fff", fontWeight: "600" },
  statusSent: { color: colors.blue, fontWeight: "700", marginTop: 6 },
  scheduledRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 6 },
  statusScheduled: { color: colors.violet, fontWeight: "700" },
  cancelScheduleLink: { color: colors.danger, fontWeight: "600", fontSize: 12.5 },
  headerActions: { flexDirection: "row", gap: spacing.md },
  headerActionText: { color: colors.ink, fontWeight: "600", fontSize: 15 },
  headerActionPrimary: { color: colors.violet, fontWeight: "800" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalCard: {
    width: "88%",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
  },
  modalTitle: { fontWeight: "800", fontSize: 16, color: colors.ink, marginBottom: 12, alignSelf: "flex-start" },
  picker: { width: "100%" },
  modalActions: { flexDirection: "row", gap: spacing.sm, width: "100%", marginTop: 16 },
  modalActionFlex: { flex: 1 },
  modalButton: { height: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
  modalCancelButton: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line },
  modalConfirmText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalCancelText: { color: colors.sub, fontWeight: "600", fontSize: 15 },
});
