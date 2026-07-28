import React, { useCallback, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import {
  contactsApi,
  type Contact,
  type ContactEmail,
  type ContactLog,
  type ContactMethod,
} from "../services/contactsApi";
import { confirmAction } from "../utils/confirm";
import { EmailListEditor } from "../components/EmailListEditor";
import { KeyboardAvoidingScreen } from "../components/KeyboardAvoidingScreen";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ContactDetail">;

const CONTACT_METHOD_OPTIONS: { label: string; value: ContactMethod }[] = [
  { label: "이메일", value: "EMAIL" },
  { label: "카카오톡", value: "KAKAO" },
  { label: "전화", value: "CALL" },
  { label: "기타", value: "OTHER" },
];

function formatContactMethod(method: ContactMethod): string {
  return CONTACT_METHOD_OPTIONS.find((option) => option.value === method)?.label ?? "기타";
}

export function ContactDetailScreen({ route, navigation }: Props) {
  const { contactId } = route.params;
  const [contact, setContact] = useState<Contact | null>(null);
  const [logs, setLogs] = useState<ContactLog[]>([]);
  const [emails, setEmails] = useState<ContactEmail[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [contactMethod, setContactMethod] = useState<ContactMethod>("OTHER");

  const loadEmails = useCallback(async () => {
    setEmails(await contactsApi.listEmails(contactId));
  }, [contactId]);

  const load = useCallback(async () => {
    const [contactRes, logsRes] = await Promise.all([
      contactsApi.get(contactId),
      contactsApi.listLogs(contactId),
    ]);
    setContact(contactRes);
    setLogs(logsRes);
    await loadEmails();
  }, [contactId, loadEmails]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleLog = async () => {
    await contactsApi.addLog(contactId, "MEETING");
    load();
  };

  const handleDelete = () => {
    confirmAction("삭제하시겠습니까?", async () => {
      await contactsApi.remove(contactId);
      navigation.goBack();
    });
  };

  const handleStartEdit = () => {
    if (!contact) return;
    setName(contact.name);
    setAffiliation(contact.affiliation ?? "");
    setPhone(contact.phone ?? "");
    setMemo(contact.memo ?? "");
    setPhotoUrl(contact.photoUrl);
    setContactMethod(contact.contactMethod ?? "OTHER");
    setEditing(true);
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
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    setPhotoUrl(`data:image/jpeg;base64,${result.assets[0].base64}`);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("이름을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const updated = await contactsApi.update(contactId, {
        name: name.trim(),
        affiliation: affiliation.trim() || null,
        phone: phone.trim() || null,
        memo: memo.trim() || null,
        photoUrl,
        contactMethod,
      });
      setContact(updated);
      setEditing(false);
    } catch (err) {
      Alert.alert("저장 실패", err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setSaving(false);
    }
  };

  if (!contact) return null;

  if (editing) {
    return (
      <KeyboardAvoidingScreen>
      <ScrollView style={styles.container}>
        <Pressable style={styles.photoPicker} onPress={handlePickPhoto}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.photo} />
          ) : (
            <Text style={styles.photoPlaceholder}>+{"\n"}사진</Text>
          )}
        </Pressable>

        <TextInput style={styles.input} placeholder="이름 *" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="소속" value={affiliation} onChangeText={setAffiliation} />
        <TextInput
          style={styles.input}
          placeholder="전화번호"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>연락 방법</Text>
        <View style={styles.optionRow}>
          {CONTACT_METHOD_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.optionChip, contactMethod === option.value && styles.optionChipActive]}
              onPress={() => setContactMethod(option.value)}
            >
              <Text style={[styles.optionText, contactMethod === option.value && styles.optionTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={[styles.input, styles.memo]}
          placeholder="메모"
          value={memo}
          onChangeText={setMemo}
          multiline
        />

        <View style={styles.editSection}>
          <Text style={styles.sectionTitle}>이메일</Text>
          <EmailListEditor
            emails={emails}
            onAdd={async (value) => {
              await contactsApi.addEmail(contactId, value);
              await loadEmails();
            }}
            onSetPrimary={async (id) => {
              const updated = await contactsApi.setPrimaryEmail(contactId, id);
              setContact(updated);
              await loadEmails();
            }}
            onRemove={async (id) => {
              await contactsApi.removeEmail(contactId, id);
              await loadEmails();
            }}
          />
        </View>

        <View style={styles.actions}>
          <Pressable style={[styles.button, styles.cancelButton]} onPress={() => setEditing(false)} disabled={saving}>
            <Text style={styles.cancelButtonText}>취소</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={handleSave} disabled={saving}>
            <Text style={styles.buttonText}>{saving ? "저장 중..." : "저장"}</Text>
          </Pressable>
        </View>
      </ScrollView>
      </KeyboardAvoidingScreen>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.detailHeader}>
        <View style={styles.detailInfo}>
          <Text style={styles.name}>{contact.name}</Text>
          <Text style={styles.meta}>{contact.affiliation ?? "-"}</Text>
          <Text style={styles.meta}>{contact.phone ?? "-"}</Text>
        </View>
        {contact.photoUrl ? (
          <Image source={{ uri: contact.photoUrl }} style={styles.detailPhoto} />
        ) : (
          <View style={[styles.detailPhoto, styles.detailPhotoPlaceholder]}>
            <Text style={styles.detailPhotoPlaceholderText}>{contact.name[0] ?? "?"}</Text>
          </View>
        )}
      </View>
      <View style={styles.contactMethodRow}>
        <Text style={styles.contactMethodLabel}>연락 방법</Text>
        <Text style={styles.contactMethodValue}>
          {formatContactMethod(contact.contactMethod ?? "OTHER")}
        </Text>
      </View>
      {contact.memo ? <Text style={styles.memoText}>{contact.memo}</Text> : null}
      <Text style={styles.badge}>{contact.source === "BLE" ? "BLE로 태깅됨" : "수동 등록"}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>이메일</Text>
        {emails.length === 0 ? (
          <Text style={styles.empty}>등록된 이메일이 없습니다.</Text>
        ) : (
          emails.map((item) => (
            <View key={item.id} style={styles.emailRow}>
              <Text style={styles.emailText}>{item.email}</Text>
              {item.isPrimary ? (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>대표</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={handleLog}>
          <Text style={styles.buttonText}>연락했음으로 기록</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={handleStartEdit}>
          <Text style={styles.buttonText}>정보 수정</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.danger]} onPress={handleDelete}>
          <Text style={styles.buttonText}>삭제</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>연락 이력</Text>
      {logs.length === 0 ? (
        <Text style={styles.empty}>기록된 연락이 없습니다.</Text>
      ) : (
        logs.map((log) => (
          <View key={log.id} style={styles.logRow}>
            <Text>{log.channel}</Text>
            <Text style={styles.meta}>{new Date(log.contactedAt).toLocaleString()}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.lg },
  detailInfo: { flex: 1 },
  detailPhoto: { width: 88, height: 88, borderRadius: radius.md },
  detailPhotoPlaceholder: { backgroundColor: colors.violetSoft, alignItems: "center", justifyContent: "center" },
  detailPhotoPlaceholderText: { color: colors.violet, fontSize: 30, fontWeight: "700" },
  name: { fontSize: 22, fontWeight: "800", color: colors.ink },
  meta: { color: colors.sub, marginTop: 4 },
  contactMethodRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg },
  contactMethodLabel: { color: colors.sub, fontWeight: "600" },
  contactMethodValue: {
    color: colors.violet,
    fontWeight: "700",
    backgroundColor: colors.violetSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  memoText: { marginTop: spacing.sm, fontStyle: "italic", color: colors.ink },
  badge: { marginTop: spacing.sm, color: colors.violet, fontWeight: "700" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  button: { flex: 1, backgroundColor: colors.ink, borderRadius: radius.md, padding: 12, alignItems: "center" },
  cancelButton: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  cancelButtonText: { fontWeight: "600", color: colors.ink },
  danger: { backgroundColor: colors.danger },
  buttonText: { color: "#fff", fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 24, marginBottom: 8, color: colors.ink },
  section: { marginTop: spacing.sm },
  editSection: { marginBottom: spacing.sm },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  emailText: { flexShrink: 1, color: colors.ink },
  primaryBadge: { backgroundColor: colors.violetSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  primaryBadgeText: { color: colors.violet, fontWeight: "600", fontSize: 11 },
  empty: { color: colors.faint },
  logRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  photoPicker: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    backgroundColor: colors.violetSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  photo: { width: 88, height: 88 },
  photoPlaceholder: { textAlign: "center", color: colors.violet, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: spacing.md,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  label: { fontWeight: "600", marginBottom: spacing.sm, color: colors.ink },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  optionChip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.card,
  },
  optionChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  optionText: { color: colors.ink, fontWeight: "600" },
  optionTextActive: { color: "#fff" },
  memo: { height: 80, textAlignVertical: "top" },
});
