import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import axios from "axios";
import { colors, radius, spacing } from "../theme/colors";

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

// 서버(email.controller.ts) 및 LoginScreen.tsx와 동일한 규칙.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const isValidEmail = EMAIL_REGEX.test(newEmail.trim());

  const handleAdd = async () => {
    const email = newEmail.trim();
    if (!EMAIL_REGEX.test(email)) return;
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
            <ActivityIndicator size="small" color={colors.violet} />
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
        <Pressable
          style={[styles.addButton, !isValidEmail && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={adding || !isValidEmail}
        >
          <Text style={styles.addButtonText}>{adding ? "추가 중..." : "추가"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowInfo: { flexDirection: "row", alignItems: "center", flex: 1, gap: spacing.sm, marginRight: spacing.sm },
  email: { flexShrink: 1, fontSize: 14, color: colors.ink },
  primaryBadge: { backgroundColor: colors.violetSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  primaryBadgeText: { color: colors.violet, fontWeight: "600", fontSize: 11 },
  rowActions: { flexDirection: "row", gap: spacing.md },
  link: { color: colors.violet, fontSize: 12, fontWeight: "600" },
  remove: { color: colors.danger, fontSize: 12, fontWeight: "600" },
  addRow: { flexDirection: "row", gap: spacing.sm, marginTop: 4 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 10,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  addButton: { backgroundColor: colors.violet, borderRadius: radius.md, paddingHorizontal: 14, justifyContent: "center" },
  addButtonDisabled: { backgroundColor: colors.faint },
  addButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});
