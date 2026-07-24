import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { contactsApi, type Contact, type ContactLog } from "../services/contactsApi";

type Props = NativeStackScreenProps<RootStackParamList, "ContactDetail">;

export function ContactDetailScreen({ route, navigation }: Props) {
  const { contactId } = route.params;
  const [contact, setContact] = useState<Contact | null>(null);
  const [logs, setLogs] = useState<ContactLog[]>([]);

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
    Alert.alert("삭제하시겠습니까?", undefined, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await contactsApi.remove(contactId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!contact) return null;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.name}>{contact.name}</Text>
      <Text style={styles.meta}>{contact.affiliation ?? "-"}</Text>
      <Text style={styles.meta}>{contact.email ?? "-"}</Text>
      <Text style={styles.meta}>{contact.phone ?? "-"}</Text>
      {contact.memo ? <Text style={styles.memo}>{contact.memo}</Text> : null}
      <Text style={styles.badge}>{contact.source === "BLE" ? "BLE로 태깅됨" : "수동 등록"}</Text>

      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={handleLog}>
          <Text style={styles.buttonText}>연락했음으로 기록</Text>
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
  name: { fontSize: 22, fontWeight: "700" },
  meta: { color: "#666", marginTop: 4 },
  memo: { marginTop: 8, fontStyle: "italic" },
  badge: { marginTop: 8, color: "#111", fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8, marginTop: 16 },
  button: { flex: 1, backgroundColor: "#111", borderRadius: 8, padding: 12, alignItems: "center" },
  danger: { backgroundColor: "#b00020" },
  buttonText: { color: "#fff", fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 24, marginBottom: 8 },
  empty: { color: "#999" },
  logRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
});
