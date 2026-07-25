import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import axios from "axios";

interface EmailItem {
  id: string;
  email: string;
  isPrimary: boolean;
}

interface Props {
  emails: EmailItem[];
  onAdd: (email: string) => Promise<void>;
  onSetPrimary: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.error) {
    return err.response.data.error;
  }
  return fallback;
}

export function EmailListEditor({ emails, onAdd, onSetPrimary, onRemove }: Props) {
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleAdd = async () => {
    const email = newEmail.trim();
    if (!email) return;
    setAdding(true);
    try {
      await onAdd(email);
      setNewEmail("");
    } catch (err) {
      Alert.alert("추가 실패", getErrorMessage(err, "이메일을 추가하지 못했습니다."));
    } finally {
      setAdding(false);
    }
  };

  const handleSetPrimary = async (id: string) => {
    setBusyId(id);
    try {
      await onSetPrimary(id);
    } catch (err) {
      Alert.alert("변경 실패", getErrorMessage(err, "대표 이메일로 설정하지 못했습니다."));
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (id: string) => {
    setBusyId(id);
    try {
      await onRemove(id);
    } catch (err) {
      Alert.alert("삭제 실패", getErrorMessage(err, "이메일을 삭제하지 못했습니다."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.container}>
      {emails.map((item) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.email} numberOfLines={1}>
              {item.email}
            </Text>
            {item.isPrimary ? (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryBadgeText}>대표</Text>
              </View>
            ) : null}
          </View>

          {busyId === item.id ? (
            <ActivityIndicator size="small" color="#111" />
          ) : (
            <View style={styles.rowActions}>
              {!item.isPrimary && (
                <Pressable onPress={() => handleSetPrimary(item.id)} hitSlop={8}>
                  <Text style={styles.link}>대표로 설정</Text>
                </Pressable>
              )}
              {!item.isPrimary && (
                <Pressable onPress={() => handleRemove(item.id)} hitSlop={8}>
                  <Text style={styles.remove}>삭제</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      ))}

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="이메일 추가 (예: school@ac.kr)"
          value={newEmail}
          onChangeText={setNewEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Pressable style={styles.addButton} onPress={handleAdd} disabled={adding}>
          <Text style={styles.addButtonText}>{adding ? "추가 중..." : "추가"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowInfo: { flexDirection: "row", alignItems: "center", flex: 1, gap: 8, marginRight: 8 },
  email: { flexShrink: 1, fontSize: 14 },
  primaryBadge: { backgroundColor: "#EEF3FF", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  primaryBadgeText: { color: "#4285F4", fontWeight: "600", fontSize: 11 },
  rowActions: { flexDirection: "row", gap: 12 },
  link: { color: "#4285F4", fontSize: 12, fontWeight: "600" },
  remove: { color: "#B00020", fontSize: 12, fontWeight: "600" },
  addRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10 },
  addButton: { backgroundColor: "#111", borderRadius: 8, paddingHorizontal: 14, justifyContent: "center" },
  addButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});
