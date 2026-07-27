import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MailStackParamList } from "../navigation/mailTypes";
import { mailApi, type MailDraft } from "../services/mailApi";
import { confirmAction } from "../utils/confirm";
import { GradientView } from "../components/GradientView";
import { colors, radius, spacing } from "../theme/colors";

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

  if (!draft) return null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.contactName}>
          {draft.contact?.name ?? (draft.group ? `${draft.group.name} (그룹 공통)` : "삭제된 인맥")}
        </Text>
        <View style={styles.channelBadge}>
          <Text style={styles.channelBadgeText}>{draft.channel === "EMAIL" ? "이메일" : "문자"}</Text>
        </View>
      </View>
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
            <GradientView style={styles.button} borderRadius={radius.md}>
              <Text style={styles.buttonText}>저장</Text>
            </GradientView>
          )}
        </Pressable>
      </View>
    </ScrollView>
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
});
