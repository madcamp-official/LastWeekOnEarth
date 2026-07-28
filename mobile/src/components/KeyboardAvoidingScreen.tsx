import React from "react";
import { KeyboardAvoidingView, Platform, StyleProp, StyleSheet, ViewStyle } from "react-native";

interface KeyboardAvoidingScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// 입력칸이 있는 모든 화면에서 공통으로 쓰는 래퍼 — 키보드가 올라올 때 내용을 밀어올려서
// 화면 아래쪽 입력칸/버튼이 가려지지 않게 한다. Android는 AndroidManifest의
// windowSoftInputMode="adjustResize"가 이미 처리해주므로 behavior를 적용하지 않는다.
export function KeyboardAvoidingScreen({ children, style }: KeyboardAvoidingScreenProps) {
  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
