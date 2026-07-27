import { PermissionsAndroid, Platform } from "react-native";

// 이 앱이 advertise하는 서비스임을 스캔 쪽에서 식별하기 위한 고정 UUID (무작위 생성, 다른 앱과 충돌 방지용).
export const BLE_SERVICE_UUID = "e399082d-a98e-435e-8118-f1682046732d";
export const BLE_RSSI_THRESHOLD = -50;

// 웹(Expo web)에는 BLE 관련 네이티브 모듈이 없으므로, 웹에서는 모듈 로드 자체를 건너뛴다.
const BleManager = Platform.OS === "web" ? null : require("react-native-ble-plx").BleManager;
// react-native-ble-advertiser는 Android 전용 네이티브 구현만 있다 (iOS 광고 미지원, 위 startAdvertising
// 주석 참고). iOS에서 require하면 네이티브 모듈이 없어 default가 null이 되어 즉시 크래시하므로 건너뛴다.
const BLEAdvertiser = Platform.OS === "android" ? require("react-native-ble-advertiser").default : null;

export const bleManager = Platform.OS === "web" ? null : new BleManager();

// iOS는 CoreBluetooth 제약상 광고 패킷에 manufacturerData를 실을 수 없어(시스템이 무시함),
// service UUID 자체에 코드를 실어 광고한다. 앞 24자리(prefix)는 고정, 마지막 8자리(4바이트)에
// 서버가 발급한 code(8 hex chars)를 그대로 넣는다.
const IOS_SERVICE_UUID_PREFIX = "e399082d-a98e-435e-8118-0000";

function iosServiceUuidForCode(code: string): string {
  return `${IOS_SERVICE_UUID_PREFIX}${code.padStart(8, "0")}`;
}

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
 * Android는 react-native-ble-advertiser로 고정 서비스 UUID + manufacturerData에 코드를 실어
 * 광고한다. iOS는 CBPeripheralManager(react-native-ble-peripheral)로 앱이 foreground일 때만
 * 광고한다 — 앱이 백그라운드로 가면 iOS가 광고를 중단시키므로 별도 처리는 하지 않는다.
 */
export async function startAdvertising(code: string): Promise<void> {
  if (Platform.OS === "android") {
    await BLEAdvertiser.broadcast(BLE_SERVICE_UUID, hexToBytes(code), {
      connectable: false,
      includeDeviceName: false,
    });
    return;
  }

  if (Platform.OS === "ios") {
    BLEPeripheral.addService(iosServiceUuidForCode(code), true);
    await BLEPeripheral.start();
    return;
  }

  console.warn("[bleService] 이 플랫폼은 BLE 광고를 지원하지 않습니다.");
}

export async function stopAdvertising(): Promise<void> {
  if (Platform.OS === "android") {
    await BLEAdvertiser.stopBroadcast();
    return;
  }
  if (Platform.OS === "ios") {
    BLEPeripheral.stop();
  }
}

/**
 * 주변에서 이 앱이 advertise 중인 코드를 스캔한다. RSSI가 임계값 이상(=충분히 가까움)인
 * 기기만 콜백을 호출한다. 반환된 함수를 호출하면 스캔을 멈춘다.
 *
 * Android 피어의 코드는 manufacturerData에, iOS 피어의 코드는 service UUID 마지막 8자리에
 * 실려 온다(iOS 광고 제약 때문 - startAdvertising 주석 참고). 두 인코딩을 다 걸러내야 해서
 * UUID 배열 필터 없이 스캔한 뒤 코드에서 직접 두 케이스를 구분한다.
 */
export function scanForNearbyCodes(onFound: (code: string, rssi: number) => void): () => void {
  if (!bleManager) {
    console.warn("[bleService] 이 플랫폼에서는 BLE 스캔을 지원하지 않습니다.");
    return () => undefined;
  }

  bleManager.startDeviceScan(null, { allowDuplicates: true }, (error: any, device: any) => {
    if (error) {
      console.warn("[bleService] scan error:", error.message);
      return;
    }
    if (!device || device.rssi == null) return;
    if (device.rssi < BLE_RSSI_THRESHOLD) return;

    const serviceUuids: string[] = device.serviceUUIDs ?? [];

    if (device.manufacturerData != null && serviceUuids.some((u) => u.toLowerCase() === BLE_SERVICE_UUID)) {
      const code = bytesToHex(base64ToBytes(device.manufacturerData));
      onFound(code, device.rssi);
      return;
    }

    const iosServiceUuid = serviceUuids.find((u) => u.toLowerCase().startsWith(IOS_SERVICE_UUID_PREFIX));
    if (iosServiceUuid) {
      onFound(iosServiceUuid.slice(-8), device.rssi);
    }
  });

  return () => bleManager?.stopDeviceScan();
}
