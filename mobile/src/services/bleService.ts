import { PermissionsAndroid, Platform } from "react-native";

// 이 앱이 advertise하는 서비스임을 스캔 쪽에서 식별하기 위한 고정 UUID (무작위 생성, 다른 앱과 충돌 방지용).
export const BLE_SERVICE_UUID = "e399082d-a98e-435e-8118-f1682046732d";
export const BLE_RSSI_THRESHOLD = -50;

// 웹(Expo web)에는 BLE 관련 네이티브 모듈이 없으므로, 웹에서는 모듈 로드 자체를 건너뛴다.
const BleManager = Platform.OS === "web" ? null : require("react-native-ble-plx").BleManager;
const BLEAdvertiser = Platform.OS === "web" ? null : require("react-native-ble-advertiser").default;

export const bleManager = Platform.OS === "web" ? null : new BleManager();

/**
 * Android 12(API 31) 미만은 위치 권한, 이상은 BLUETOOTH_SCAN/ADVERTISE/CONNECT 런타임 권한이 있어야
 * 스캔/광고 호출이 SecurityException 없이 동작한다. iOS는 Info.plist 설정만으로 시스템이 최초
 * 스캔 시도 시 자동으로 권한 팝업을 띄우므로 별도 요청이 필요 없다.
 */
export async function ensureBlePermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  if (Platform.Version < 31) {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ]);

  return Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
}

function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return bytes;
}

function bytesToHex(bytes: ArrayLike<number>): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// react-native-ble-plx는 manufacturerData를 base64 문자열로 준다.
// RN 환경에 atob/Buffer가 항상 있다고 보장할 수 없어 직접 디코드한다.
function base64ToBytes(base64: string): number[] {
  const clean = base64.replace(/=+$/, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of clean) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return bytes;
}

/**
 * 내 BLE 코드(서버 /contacts/ble-token 응답)를 advertise한다.
 *
 * Android만 지원한다: react-native-ble-advertiser의 iOS 광고(CBPeripheralManager 경유)는
 * 신뢰도가 낮고 검증되지 않은 네이티브 코드가 필요해 이 프로젝트에서는 의도적으로 비활성화했다.
 * iOS 기기는 스캔(다른 사람 태깅)만 가능하고, 자신을 advertise할 수는 없다 — 두 기기가
 * 서로 태깅하려면 최소 한쪽이 Android여야 한다. CBPeripheralManager 네이티브 모듈이
 * 검증되면 이 제약을 풀 수 있다.
 */
export async function startAdvertising(code: string): Promise<void> {
  if (Platform.OS !== "android") {
    console.warn("[bleService] 이 플랫폼은 BLE 광고를 지원하지 않습니다 (Android만 가능).");
    return;
  }

  await BLEAdvertiser.broadcast(BLE_SERVICE_UUID, hexToBytes(code), {
    connectable: false,
    includeDeviceName: false,
  });
}

export async function stopAdvertising(): Promise<void> {
  if (Platform.OS !== "android") return;
  await BLEAdvertiser.stopBroadcast();
}

/**
 * 주변에서 이 앱이 advertise 중인 코드를 스캔한다. RSSI가 임계값 이상(=충분히 가까움)인
 * 기기만 콜백을 호출한다. 반환된 함수를 호출하면 스캔을 멈춘다.
 */
export function scanForNearbyCodes(onFound: (code: string, rssi: number) => void): () => void {
  if (!bleManager) {
    console.warn("[bleService] 이 플랫폼에서는 BLE 스캔을 지원하지 않습니다.");
    return () => undefined;
  }

  bleManager.startDeviceScan([BLE_SERVICE_UUID], { allowDuplicates: true }, (error: any, device: any) => {
    if (error) {
      console.warn("[bleService] scan error:", error.message);
      return;
    }
    if (!device || device.manufacturerData == null || device.rssi == null) return;
    if (device.rssi < BLE_RSSI_THRESHOLD) return;

    const code = bytesToHex(base64ToBytes(device.manufacturerData));
    onFound(code, device.rssi);
  });

  return () => bleManager?.stopDeviceScan();
}
