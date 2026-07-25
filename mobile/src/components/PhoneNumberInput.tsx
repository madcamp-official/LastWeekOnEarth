import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

interface PhoneNumberInputProps {
  /** "010-1234-5678" 형식. 비어있으면 "". */
  value: string;
  onChangeValue: (value: string) => void;
  editable?: boolean;
}

function splitPhone(value: string): [string, string, string] {
  const [a = "", b = "", c = ""] = value.split("-");
  return [a, b, c];
}

const onlyDigits = (text: string) => text.replace(/[^0-9]/g, "");

/**
 * (010)-(1234)-(5678) 3분할 입력. 서버에는 항상 "-"로 조합한 문자열로 저장/전달하므로
 * 화면에 보여줄 때도(MyPageScreen 등) 별도 포맷팅 없이 그대로 -가 들어간 채로 나온다.
 */
export function PhoneNumberInput({ value, onChangeValue, editable = true }: PhoneNumberInputProps) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [p3, setP3] = useState("");
  const secondRef = useRef<TextInput>(null);
  const thirdRef = useRef<TextInput>(null);

  useEffect(() => {
    const [a, b, c] = splitPhone(value);
    setP1(a);
    setP2(b);
    setP3(c);
  }, [value]);

  const emit = (a: string, b: string, c: string) => {
    onChangeValue(!a && !b && !c ? "" : `${a}-${b}-${c}`);
  };

  return (
    <View style={styles.row}>
      <TextInput
        style={styles.box}
        value={p1}
        onChangeText={(text) => {
          const digits = onlyDigits(text).slice(0, 3);
          setP1(digits);
          emit(digits, p2, p3);
          if (digits.length === 3) secondRef.current?.focus();
        }}
        keyboardType="number-pad"
        maxLength={3}
        editable={editable}
        placeholder="010"
      />
      <Text style={styles.dash}>-</Text>
      <TextInput
        ref={secondRef}
        style={styles.box}
        value={p2}
        onChangeText={(text) => {
          const digits = onlyDigits(text).slice(0, 4);
          setP2(digits);
          emit(p1, digits, p3);
          if (digits.length === 4) thirdRef.current?.focus();
        }}
        keyboardType="number-pad"
        maxLength={4}
        editable={editable}
        placeholder="1234"
      />
      <Text style={styles.dash}>-</Text>
      <TextInput
        ref={thirdRef}
        style={styles.box}
        value={p3}
        onChangeText={(text) => {
          const digits = onlyDigits(text).slice(0, 4);
          setP3(digits);
          emit(p1, p2, digits);
        }}
        keyboardType="number-pad"
        maxLength={4}
        editable={editable}
        placeholder="5678"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", width: "100%", marginBottom: 10 },
  box: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: "#DADCE0",
    borderRadius: 8,
    paddingHorizontal: 8,
    textAlign: "center",
  },
  dash: { marginHorizontal: 6, color: "#9CA3AF", fontWeight: "600" },
});
