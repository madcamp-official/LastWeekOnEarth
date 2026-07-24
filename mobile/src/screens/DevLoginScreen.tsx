import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { useAuthStore } from "../store/useAuthStore";

/**
 * 실제 로그인 기능이 완성되기 전, 다른 기능(주소록 등)을 기기에서 바로 테스트하기 위한 임시 화면.
 * 백엔드에서 `npm run dev:token -- <username>`으로 발급한 accessToken을 붙여넣으면 된다.
 * 로그인 기능이 완성되면 이 화면과 dev:token 스크립트는 삭제하고 실제 로그인 화면으로 교체한다.
 */
export function DevLoginScreen() {
  const [token, setToken] = useState("");
  const setTokens = useAuthStore((s) => s.setTokens);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>임시 로그인 (개발용)</Text>
      <Text style={styles.desc}>
        백엔드에서{"\n"}
        <Text style={styles.code}>npm run dev:token -- alice</Text>
        {"\n"}
        실행 후 나온 accessToken을 붙여넣으세요.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="accessToken"
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        multiline
      />
      <Pressable
        style={styles.button}
        onPress={() => setTokens(token.trim(), "")}
        disabled={token.trim().length === 0}
      >
        <Text style={styles.buttonText}>저장하고 시작</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 16 },
  title: { fontSize: 20, fontWeight: "700" },
  desc: { color: "#666", lineHeight: 20 },
  code: { fontFamily: "Courier", color: "#111" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
  },
  button: { backgroundColor: "#111", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
