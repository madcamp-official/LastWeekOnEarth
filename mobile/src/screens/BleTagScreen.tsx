import React, { useEffect, useRef, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { contactsApi, type Contact } from "../services/contactsApi";
import {
  ensureBlePermissions,
  scanForNearbyCodes,
  startAdvertising,
  stopAdvertising,
} from "../services/bleService";

type Props = NativeStackScreenProps<RootStackParamList, "BleTag">;

interface FoundDevice {
  code: string;
  rssi: number;
  status: "found" | "tagging" | "tagged" | "error";
  contact?: Contact;
}

export function BleTagScreen({ navigation }: Props) {
  const [advertising, setAdvertising] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<FoundDevice[]>([]);
  const stopScanRef = useRef<(() => void) | null>(null);
  const taggedCodesRef = useRef(new Set<string>());

  useEffect(() => {
    return () => {
      stopScanRef.current?.();
      stopAdvertising();
    };
  }, []);

  const handleToggleAdvertise = async () => {
    if (advertising) {
      await stopAdvertising();
      setAdvertising(false);
      return;
    }
    if (!(await ensureBlePermissions())) {
      Alert.alert("블루투스 권한이 필요합니다.");
      return;
    }
    const { token } = await contactsApi.issueBleToken();
    await startAdvertising(token);
    setAdvertising(true);
  };

  const handleToggleScan = async () => {
    if (scanning) {
      stopScanRef.current?.();
      stopScanRef.current = null;
      setScanning(false);
      return;
    }

    if (!(await ensureBlePermissions())) {
      Alert.alert("블루투스 권한이 필요합니다.");
      return;
    }

    setDevices([]);
    taggedCodesRef.current.clear();
    stopScanRef.current = scanForNearbyCodes((code, rssi) => {
      setDevices((prev) => {
        const existing = prev.find((d) => d.code === code);
        if (existing) {
          return prev.map((d) => (d.code === code ? { ...d, rssi } : d));
        }
        return [...prev, { code, rssi, status: "found" }];
      });
    });
    setScanning(true);
  };

  const handleTag = async (code: string) => {
    if (taggedCodesRef.current.has(code)) return;
    taggedCodesRef.current.add(code);
    setDevices((prev) => prev.map((d) => (d.code === code ? { ...d, status: "tagging" } : d)));

    try {
      const contact = await contactsApi.bleTag(code);
      setDevices((prev) => prev.map((d) => (d.code === code ? { ...d, status: "tagged", contact } : d)));
    } catch {
      taggedCodesRef.current.delete(code);
      setDevices((prev) => prev.map((d) => (d.code === code ? { ...d, status: "error" } : d)));
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={handleToggleAdvertise}>
        <Text style={styles.buttonText}>
          {Platform.OS !== "android"
            ? "iOS는 광고 미지원 (스캔만 가능)"
            : advertising
              ? "내 프로필 광고 중지"
              : "내 프로필 광고 시작"}
        </Text>
      </Pressable>

      <Pressable style={styles.button} onPress={handleToggleScan}>
        <Text style={styles.buttonText}>{scanning ? "주변 기기 스캔 중지" : "주변 기기 스캔 시작"}</Text>
      </Pressable>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>{scanning ? "주변 기기를 찾는 중..." : "스캔을 시작해주세요."}</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.code}>{item.contact ? item.contact.name : `기기 ${item.code}`}</Text>
              <Text style={styles.meta}>RSSI {item.rssi}dBm</Text>
            </View>
            {item.status === "found" && (
              <Pressable style={styles.tagButton} onPress={() => handleTag(item.code)}>
                <Text style={styles.buttonText}>태깅</Text>
              </Pressable>
            )}
            {item.status === "tagging" && <Text style={styles.meta}>등록 중...</Text>}
            {item.status === "tagged" && (
              <Pressable
                onPress={() =>
                  item.contact && navigation.navigate("ContactDetail", { contactId: item.contact.id })
                }
              >
                <Text style={styles.done}>등록 완료 →</Text>
              </Pressable>
            )}
            {item.status === "error" && <Text style={styles.error}>실패, 다시 시도</Text>}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  button: { backgroundColor: "#111", borderRadius: 8, padding: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  list: { gap: 8, marginTop: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  code: { fontWeight: "600" },
  meta: { color: "#666", marginTop: 2 },
  tagButton: { backgroundColor: "#111", borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  done: { color: "#0a7", fontWeight: "600" },
  error: { color: "#b00020" },
  empty: { textAlign: "center", marginTop: 40, color: "#999" },
});
