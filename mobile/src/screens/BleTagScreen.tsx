import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
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
  // 태깅 전에는 서버 미리보기(ble-preview)로 채워지고, 태깅 후에는 contact.name으로 대체된다.
  name?: string;
  affiliation?: string | null;
  // 미리보기가 응답하기 전에는 아직 모른다 — 같은 사람이 스캔 재시작으로 새 코드를 다시 발급받아
  // 광고하면 code는 바뀌지만 userId는 그대로라, 이 값으로 목록에서 중복을 걸러낸다.
  userId?: string;
}

const AVATAR_COLORS = [colors.violet, colors.blue, colors.pink];
const avatarColorFor = (code: string) => AVATAR_COLORS[code.charCodeAt(0) % AVATAR_COLORS.length];

// BLE 탭은 RootStackParamList가 아니라 탭 네비게이터 최상위에 바로 떠 있어서(RootNavigator.tsx),
// 태깅 완료 후 Home 탭의 ContactDetail로 넘어가려면 부모(탭) 네비게이터를 통해 중첩 이동해야 한다.
export function BleTagScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<FoundDevice[]>([]);
  const stopScanRef = useRef<(() => void) | null>(null);
  const taggedCodesRef = useRef(new Set<string>());
  // 같은 코드에 대해 미리보기 요청을 중복으로 보내지 않기 위한 표시.
  const previewedCodesRef = useRef(new Set<string>());
  // 언마운트(또는 재시작 도중 다시 취소) 이후 비동기 응답이 와서 상태를 건드리는 걸 막는다.
  const activeRef = useRef(true);

  // 광고(내 프로필 알리기)와 스캔(상대 찾기)을 동시에 시작한다. 화면 진입 시 자동으로 한 번
  // 실행되고, "스캔 취소" 이후 가운데 로고를 다시 눌러서 재시작할 때도 이 함수를 그대로 쓴다.
  const startScanning = useCallback(async () => {
    activeRef.current = true;
    if (!(await ensureBlePermissions())) {
      notify("블루투스 권한이 필요합니다.", "설정에서 블루투스 권한을 허용해주세요.");
      return;
    }
    if (!activeRef.current) return;

    // 광고 완료를 기다리지 않고 바로 스캔을 시작한다 — iOS는 블루투스 상태가 막 켜지는 시점
    // (특히 앱을 처음 열어 권한 팝업에 아직 응답 전)이면 광고 시작 자체가 몇 초 지연될 수 있는데,
    // 그걸 기다리느라 "찾는 중" 표시(=스캔 시작)까지 늦어지면 체감 속도가 느려진다.
    contactsApi
      .issueBleToken()
      .then(({ token }) => (activeRef.current ? startAdvertising(token) : undefined))
      .catch((err) => console.warn("[BleTagScreen] advertising failed:", err));

    taggedCodesRef.current.clear();
    previewedCodesRef.current.clear();
    setDevices([]);
    stopScanRef.current = scanForNearbyCodes((code, rssi) => {
      setDevices((prev) => {
        const existing = prev.find((d) => d.code === code);
        if (existing) {
          return prev.map((d) => (d.code === code ? { ...d, rssi } : d));
        }
        return [...prev, { code, rssi, status: "found" }];
      });

      // 처음 보는 코드면 이름/소속을 미리 조회한다 — 목록에 "기기 xxxx" 대신 실제 이름이 보이도록.
      if (previewedCodesRef.current.has(code)) return;
      previewedCodesRef.current.add(code);
      contactsApi
        .previewBleCode(code)
        .then(({ userId, name, affiliation }) => {
          setDevices((prev) => {
            // 같은 사람(userId)이 이미 다른 코드로 목록에 있으면 하나로 합친다 — 스캔을 재시작하면
            // 광고 쪽도 새 코드를 다시 발급받아서, 같은 사람이 두 코드로 두 번 잡히는 문제가 있었다.
            const duplicate = prev.find((d) => d.userId === userId && d.code !== code);
            const withoutDuplicate = duplicate ? prev.filter((d) => d.code !== duplicate.code) : prev;
            return withoutDuplicate.map((d) => {
              if (d.code !== code) return d;
              // 예전 코드가 이미 등록 완료 상태였다면 새로 합쳐진 항목도 그 상태를 유지한다.
              if (duplicate?.status === "tagged") {
                return { ...d, userId, name, affiliation, status: "tagged", contact: duplicate.contact };
              }
              return { ...d, userId, name, affiliation };
            });
          });
        })
        .catch(() => {
          // 만료됐거나 등록되지 않은 코드일 수 있다 — 이름 없이 코드만 보여주는 것으로 충분하다.
          previewedCodesRef.current.delete(code);
        });
    });
    setScanning(true);
  }, []);

  // 화면을 열면 자동으로 시작한다 — 두 기기 모두 이 화면을 열어두기만 하면 서로 알아서 찾아내야
  // 해서, 수동으로 눌러야 하는 시작 버튼은 오히려 인식을 늦추는 걸림돌이었다.
  useEffect(() => {
    startScanning().catch(() => undefined);
    return () => {
      activeRef.current = false;
      stopScanRef.current?.();
      stopAdvertising();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    activeRef.current = false;
    stopScanRef.current?.();
    stopScanRef.current = null;
    stopAdvertising();
    setScanning(false);
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
            <Pressable onPress={() => startScanning()}>
              <View style={styles.idleOuter}>
                <Image source={require("../../assets/Anchora_main.png")} style={styles.idleLogo} resizeMode="cover" />
              </View>
            </Pressable>
            <Text style={styles.idleHint}>로고를 눌러서 다시 찾기를 시작하세요</Text>
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
                  <Text style={styles.avatarText}>{(item.contact?.name ?? item.name)?.[0] ?? "?"}</Text>
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{item.contact?.name ?? item.name ?? `기기 ${item.code}`}</Text>
                  <Text style={styles.deviceMeta}>
                    {item.affiliation ? `${item.affiliation} · ` : ""}RSSI {item.rssi}dBm
                  </Text>
                </View>
                {item.status === "found" && (
                  <Pressable onPress={() => handleTag(item.code)}>
                    <GradientView style={styles.tagButton} borderRadius={radius.md}>
                      <Text style={styles.tagButtonText}>등록</Text>
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

      {scanning && (
        <View style={styles.actions}>
          <Pressable style={styles.secondaryButton} onPress={handleReset}>
            <Text style={styles.secondaryButtonText}>스캔 취소</Text>
          </Pressable>
        </View>
      )}
    </View>
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
  idleLogo: { width: 120, height: 120, borderRadius: 60 },
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
