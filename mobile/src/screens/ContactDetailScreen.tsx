import React, { useCallback, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { contactsApi, type Contact, type ContactLog } from "../services/contactsApi";
import { confirmAction } from "../utils/confirm";

type Props = NativeStackScreenProps<RootStackParamList, "ContactDetail">;

export function ContactDetailScreen({ route, navigation }: Props) {
  const { contactId } = route.params;
  const [contact, setContact] = useState<Contact | null>(null);
  const [logs, setLogs] = useState<ContactLog[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [contactRes, logsRes] = await Promise.all([
      contactsApi.get(contactId),
      contactsApi.listLogs(contactId),
    ]);
    setContact(contactRes);
    setLogs(logsRes);
  }, [contactId]);

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
    setEmail(contact.email ?? "");
    setPhone(contact.phone ?? "");
    setMemo(contact.memo ?? "");
    setPhotoUrl(contact.photoUrl);
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
        affiliation: affiliation.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        memo: memo.trim() || undefined,
        photoUrl: photoUrl ?? undefined,
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
          placeholder="이메일"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="전화번호"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={[styles.input, styles.memo]}
          placeholder="메모"
          value={memo}
          onChangeText={setMemo}
          multiline
        />

        <View style={styles.actions}>
          <Pressable style={[styles.button, styles.cancelButton]} onPress={() => setEditing(false)} disabled={saving}>
            <Text style={styles.cancelButtonText}>취소</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={handleSave} disabled={saving}>
            <Text style={styles.buttonText}>{saving ? "저장 중..." : "저장"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {contact.photoUrl ? (
        <Image source={{ uri: contact.photoUrl }} style={styles.detailPhoto} />
      ) : null}
      <Text style={styles.name}>{contact.name}</Text>
      <Text style={styles.meta}>{contact.affiliation ?? "-"}</Text>
      <Text style={styles.meta}>{contact.email ?? "-"}</Text>
      <Text style={styles.meta}>{contact.phone ?? "-"}</Text>
      {contact.memo ? <Text style={styles.memoText}>{contact.memo}</Text> : null}
      <Text style={styles.badge}>{contact.source === "BLE" ? "BLE로 태깅됨" : "수동 등록"}</Text>

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
  container: { flex: 1, padding: 16 },
  detailPhoto: { width: 88, height: 88, borderRadius: 12, marginBottom: 12 },
  name: { fontSize: 22, fontWeight: "700" },
  meta: { color: "#666", marginTop: 4 },
  memoText: { marginTop: 8, fontStyle: "italic" },
  badge: { marginTop: 8, color: "#111", fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8, marginTop: 16 },
  button: { flex: 1, backgroundColor: "#111", borderRadius: 8, padding: 12, alignItems: "center" },
  cancelButton: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#DADCE0" },
  cancelButtonText: { fontWeight: "600", color: "#111" },
  danger: { backgroundColor: "#b00020" },
  buttonText: { color: "#fff", fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 24, marginBottom: 8 },
  empty: { color: "#999" },
  logRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  photoPicker: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  photo: { width: 88, height: 88 },
  photoPlaceholder: { textAlign: "center", color: "#999", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 12 },
  memo: { height: 80, textAlignVertical: "top" },
});
