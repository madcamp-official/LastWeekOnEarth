import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { contactsApi } from "../services/contactsApi";

type Props = NativeStackScreenProps<RootStackParamList, "AddContact">;

export function AddContactScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("이름을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await contactsApi.create({
        name: name.trim(),
        affiliation: affiliation.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        memo: memo.trim() || undefined,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert("등록 실패", err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
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

      <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "등록 중..." : "등록"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12 },
  memo: { height: 80, textAlignVertical: "top" },
  button: { backgroundColor: "#111", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
