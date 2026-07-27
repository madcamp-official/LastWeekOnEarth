import React, { useEffect, useRef, useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import Svg, { Circle, Path } from "react-native-svg";
import { contactsApi, type Contact } from "../services/contactsApi";
import { ensureBlePermissions, scanForNearbyCodes, startAdvertising, stopAdvertising } from "../services/bleService";
import { GradientView } from "../components/GradientView";
import { RadarPulse } from "../components/RadarPulse";
import { notify } from "../utils/confirm";
import { colors, radius, spacing } from "../theme/colors";

interface FoundDevice {
  code: string;
  rssi: number;
  status: "found" | "tagging" | "tagged" | "error";
  contact?: Contact;
}

const AVATAR_COLORS = [colors.violet, colors.blue, colors.pink];
const avatarColorFor = (code: string) => AVATAR_COLORS[code.charCodeAt(0) % AVATAR_COLORS.length];

// BLE 탭은 RootStackParamList가 아니라 탭 네비게이터 최상위에 바로 떠 있어서(RootNavigator.tsx),
// 태깅 완료 후 Home 탭의 ContactDetail로 넘어가려면 부모(탭) 네비게이터를 통해 중첩 이동해야 한다.
export function BleTagScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
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

  const handleStart = async () => {
    if (!(await ensureBlePermissions())) {
      notify("블루투스 권한이 필요합니다.", "설정에서 블루투스 권한을 허용해주세요.");
      return;
    }

    try {
      const { token } = await contactsApi.issueBleToken();
      await startAdvertising(token);
      setAdvertising(true);
    } catch {
      notify("광고를 시작하지 못했습니다.", "잠시 후 다시 시도해주세요.");
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

  const handleReset = () => {
    stopScanRef.current?.();
    stopScanRef.current = null;
    stopAdvertising();
    setScanning(false);
    setAdvertising(false);
    setDevices([]);
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

  const goToContact = (contactId: string) => {
    navigation.navigate("Home", { screen: "ContactDetail", params: { contactId } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>태깅</Text>
        <Text style={styles.subtitle}>가까이 있는 사람을 찾아 인맥으로 남겨보세요</Text>
      </View>

      <View style={styles.stage}>
        {!scanning && (
          <View style={styles.idle}>
            <View style={styles.idleOuter}>
              <GradientView style={styles.idleInner} borderRadius={60}>
                <BleGlyph />
              </GradientView>
            </View>
            <Text style={styles.idleHint}>
              {Platform.OS === "ios"
                ? "iOS는 스캔만 가능해요. 상대가 Android라면 자동으로 인식돼요"
                : "주변 사람을 찾을 준비가 됐어요\n둘 다 앱을 켜고 있으면 자동으로 인식해요"}
            </Text>
          </View>
        )}

        {scanning && devices.length === 0 && (
          <View style={styles.scanning}>
            <RadarPulse />
            <Text style={styles.scanningText}>주변에서 인맥을 찾는 중...</Text>
          </View>
        )}

        {scanning && devices.length > 0 && (
          <FlatList
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={devices}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <View style={styles.deviceRow}>
                <View style={[styles.avatar, { backgroundColor: avatarColorFor(item.code) }]}>
                  <Text style={styles.avatarText}>{item.contact ? item.contact.name[0] : "?"}</Text>
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{item.contact ? item.contact.name : `기기 ${item.code}`}</Text>
                  <Text style={styles.deviceMeta}>RSSI {item.rssi}dBm</Text>
                </View>
                {item.status === "found" && (
                  <Pressable onPress={() => handleTag(item.code)}>
                    <GradientView style={styles.tagButton} borderRadius={radius.md}>
                      <Text style={styles.tagButtonText}>태깅</Text>
                    </GradientView>
                  </Pressable>
                )}
                {item.status === "tagging" && <Text style={styles.deviceMeta}>등록 중...</Text>}
                {item.status === "tagged" && (
                  <Pressable onPress={() => item.contact && goToContact(item.contact.id)}>
                    <Text style={styles.done}>등록 완료 →</Text>
                  </Pressable>
                )}
                {item.status === "error" && <Text style={styles.error}>실패, 다시 시도</Text>}
              </View>
            )}
          />
        )}
      </View>

      <View style={styles.actions}>
        {!scanning && (
          <Pressable onPress={handleStart}>
            <GradientView style={styles.primaryButton} borderRadius={radius.lg}>
              <Text style={styles.primaryButtonText}>주변 사람 찾기 시작</Text>
            </GradientView>
          </Pressable>
        )}
        {scanning && (
          <Pressable style={styles.secondaryButton} onPress={handleReset}>
            <Text style={styles.secondaryButtonText}>스캔 취소</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function BleGlyph() {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="2.4" stroke="#fff" strokeWidth={1.8} />
      <Path
        d="M12 7.5V14M12 14C7.5 14 6 11.5 6 9M12 14C16.5 14 18 11.5 18 9"
        stroke="#fff"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path d="M4 9H8M16 9H20" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 58, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  title: { fontSize: 26, fontWeight: "800", color: colors.ink },
  subtitle: { fontSize: 13.5, color: colors.sub, marginTop: 4 },
  stage: { flex: 1, alignItems: "center", justifyContent: "center" },
  idle: { alignItems: "center" },
  idleOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.violetSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  idleInner: { width: 120, height: 120, alignItems: "center", justifyContent: "center" },
  idleHint: { fontSize: 14, color: colors.sub, marginTop: 24, textAlign: "center", lineHeight: 20, paddingHorizontal: 32 },
  scanning: { alignItems: "center" },
  scanningText: { fontSize: 15, fontWeight: "600", color: colors.ink, marginTop: 28 },
  list: { width: "100%" },
  listContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 17, fontWeight: "700", color: "#fff" },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 16, fontWeight: "700", color: colors.ink },
  deviceMeta: { fontSize: 12, color: colors.sub, marginTop: 2 },
  tagButton: { paddingHorizontal: 16, paddingVertical: 10 },
  tagButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  done: { color: colors.success, fontWeight: "700" },
  error: { color: colors.danger },
  actions: { paddingHorizontal: spacing.xxl, paddingBottom: 28, paddingTop: spacing.sm },
  primaryButton: { height: 54, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryButton: {
    height: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { color: colors.sub, fontSize: 14, fontWeight: "600" },
});
