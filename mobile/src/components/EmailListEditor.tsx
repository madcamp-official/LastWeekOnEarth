import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import axios from "axios";
import { colors, radius, spacing } from "../theme/colors";
import { notify } from "../utils/confirm";

interface EmailItem {
  id: string;
  email: string;
  isPrimary: boolean;
}

interface Props {
  emails: EmailItem[];
  onAdd: (email: string) => Promise<void>;
  onUpdate?: (id: string, email: string) => Promise<void>;
  onSetPrimary: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

// 서버(email.controller.ts) 및 LoginScreen.tsx와 동일한 규칙.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.error) {
    return err.response.data.error;
  }
  if (axios.isAxiosError(err) && !err.response) {
    return "서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.";
  }
  return fallback;
}

function validateEmail(email: string): string | null {
  if (!email) return "이메일을 입력해주세요.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "올바른 이메일 형식으로 입력해주세요.";
  }
  return null;
}

export function EmailListEditor({ emails, onAdd, onUpdate, onSetPrimary, onRemove }: Props) {
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState("");
  const isValidEmail = EMAIL_REGEX.test(newEmail.trim());

  const handleAdd = async () => {
    const email = newEmail.trim();
    if (!EMAIL_REGEX.test(email)) return;
    setAdding(true);
    try {
      await onAdd(email);
      setNewEmail("");
    } catch (err) {
      notify("추가 실패", getErrorMessage(err, "이메일을 추가하지 못했습니다."));
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async () => {
    const email = editingEmail.trim();
    if (!editingId || !onUpdate) return;
    const validationError = validateEmail(email);
    if (validationError) {
      notify("수정 실패", validationError);
      return;
    }
    setBusyId(editingId);
    try {
      await onUpdate(editingId, email);
      setEditingId(null);
      setEditingEmail("");
    } catch (err) {
      notify("수정 실패", getErrorMessage(err, "이메일을 수정하지 못했습니다."));
    } finally {
      setBusyId(null);
    }
  };

  const handleSetPrimary = async (id: string) => {
    setBusyId(id);
    try {
      await onSetPrimary(id);
    } catch (err) {
      notify("변경 실패", getErrorMessage(err, "대표 이메일로 설정하지 못했습니다."));
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (id: string) => {
    setBusyId(id);
    try {
      await onRemove(id);
    } catch (err) {
      notify("삭제 실패", getErrorMessage(err, "이메일을 삭제하지 못했습니다."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.container}>
      {emails.map((item) => {
        const isEditing = editingId === item.id;
        return (
          <View key={item.id} style={styles.row}>
            {isEditing ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.editInput}
                  value={editingEmail}
                  onChangeText={setEditingEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoFocus
                />
                {busyId === item.id ? (
                  <ActivityIndicator size="small" color={colors.violet} />
                ) : (
                  <View style={styles.rowActions}>
                    <Pressable onPress={handleUpdate} hitSlop={8}>
                      <Text style={styles.link}>저장</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setEditingId(null);
                        setEditingEmail("");
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.cancel}>취소</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : (
              <>
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
                    {onUpdate && (
                      <Pressable
                        onPress={() => {
                          setEditingId(item.id);
                          setEditingEmail(item.email);
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.link}>수정</Text>
                      </Pressable>
                    )}
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
              </>
            )}
          </View>
        );
      })}

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
  rowActions: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  editRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.violet,
    borderRadius: radius.md,
    padding: 9,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  link: { color: colors.violet, fontSize: 12, fontWeight: "600" },
  cancel: { color: colors.sub, fontSize: 12, fontWeight: "600" },
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
