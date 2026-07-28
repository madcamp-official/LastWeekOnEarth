import { NativeEventEmitter, PermissionsAndroid, Platform } from "react-native";

// 이 앱이 advertise하는 서비스임을 스캔 쪽에서 식별하기 위한 고정 UUID (무작위 생성, 다른 앱과 충돌 방지용).
export const BLE_SERVICE_UUID = "e399082d-a98e-435e-8118-f1682046732d";
export const BLE_RSSI_THRESHOLD = -50;

// 웹(Expo web)에는 BLE 관련 네이티브 모듈이 없으므로, 웹에서는 모듈 로드 자체를 건너뛴다.
const BleManager = Platform.OS === "web" ? null : require("react-native-ble-plx").BleManager;
// Android에서 스캔 주기를 최대로 올려(LowLatency) 발견 속도를 높이는 데 쓴다. iOS는 이 옵션이 없다.
const ScanMode = Platform.OS === "web" ? null : require("react-native-ble-plx").ScanMode;
// react-native-ble-advertiser는 Android 전용 네이티브 구현만 있다 (iOS 광고 미지원, 위 startAdvertising
// 주석 참고). `module.exports = NativeModules.BLEAdvertiser`로 내보내(ble-peripheral과 같은 패턴 —
// .default가 없다) require 결과 자체가 네이티브 모듈이다. .default를 붙이면 항상 undefined가 되어
// broadcast()/stopBroadcast() 호출이 전부 "Cannot read property 'X' of undefined"로 조용히 실패한다
// — 이 세션 내내 Android 광고가 한 번도 실제로 나간 적이 없었던 근본 원인이 바로 이거였다.
const BLEAdvertiser = Platform.OS === "android" ? require("react-native-ble-advertiser") : null;
// broadcast()는 setCompanyId()로 0이 아닌 값을 먼저 설정해두지 않으면 "Invalid company id"로
// 즉시 reject한다(react-native-ble-advertiser 소스 참고) — 이 호출이 빠져있어 Android 광고가
// 시작조차 못 하고 있었다. 0xFFFF는 Bluetooth SIG가 테스트 용도로 예약해둔 회사 ID.
const BLE_COMPANY_ID = 0xffff;
if (BLEAdvertiser) {
  BLEAdvertiser.setCompanyId(BLE_COMPANY_ID);
}
// react-native-ble-peripheral도 마찬가지로 `module.exports = NativeModules.BLEPeripheral`로 내보내
// .default가 없다 — require 결과 자체가 네이티브 모듈이다. Android에는 네이티브 구현이 없다.
const BLEPeripheral = Platform.OS === "ios" ? require("react-native-ble-peripheral") : null;
// RNBLEPeripheral.swift의 start()는 CBPeripheralManager 상태가 아직 .poweredOn이 아니면(특히 앱을
// 막 실행해 블루투스 권한 팝업에 아직 응답하지 않은 시점) resolve/reject 둘 다 하지 않고 그냥
// return해버리는 버그가 있다 — 그래서 await BLEPeripheral.start()가 영원히 안 끝날 수 있다.
// 상태가 바뀔 때마다 오는 "onWarning" 이벤트를 감시해 poweredOn이 되면 재시도한다.
const blePeripheralEmitter = BLEPeripheral ? new NativeEventEmitter(BLEPeripheral) : null;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("BLEPeripheral.start() timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

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
    // react-native-ble-advertiser는 같은 서비스 UUID로 broadcast()를 다시 호출하면(예: 화면을 나갔다가
    // 다시 들어와 재광고할 때) 내부적으로 이전 콜백을 재사용하고 이번 호출의 Promise는 그냥 버려버리는
    // 버그가 있다 — 그래서 재진입 시 광고 자체가 응답 없이 멈춘 것처럼 보였다. 매번 광고를 시작하기
    // 전에 이전 광고를 확실히 정리해서 내부 상태를 비운다 (처음 호출이라 지울 게 없어도 안전하게 무시).
    await BLEAdvertiser.stopBroadcast().catch(() => undefined);
    // advertiseMode는 LOW_LATENCY(최대 속도) 대신 BALANCED를 쓴다 — 광고(peripheral)와 스캔(central)을
    // 동시에 켜두는 폰에서, 광고를 LOW_LATENCY(가장 잦은 주기)로 돌리면 같은 라디오를 스캔과 놓고
    // 경쟁하게 되어 오히려 "내가 광고를 시작한 뒤로 상대를 스캔으로 못 찾는" 현상이 생겼다.
    // BALANCED는 그래도 기본값(LOW_POWER)보다는 훨씬 빠르게 광고하면서 스캔에 라디오 시간을 더 남겨준다.
    await BLEAdvertiser.broadcast(BLE_SERVICE_UUID, hexToBytes(code), {
      connectable: false,
      includeDeviceName: false,
      advertiseMode: BLEAdvertiser.ADVERTISE_MODE_BALANCED,
      txPowerLevel: BLEAdvertiser.ADVERTISE_TX_POWER_HIGH,
    });
    return;
  }

  if (Platform.OS === "ios") {
    BLEPeripheral.addService(iosServiceUuidForCode(code), true);
    try {
      // 1.5초 안에 안 끝나면 (블루투스 상태가 아직 poweredOn이 아니라서) start()의 네이티브
      // Promise가 영영 안 끝나는 상태로 보고 포기한다 — 화면이 "준비 중..."에 멈춰있으면 안 되므로.
      await withTimeout(BLEPeripheral.start(), 1500);
    } catch {
      // 상태가 실제로 poweredOn으로 바뀌면 "onWarning" 이벤트로 알려온다 — 그때 한 번 더 시도한다.
      const subscription = blePeripheralEmitter?.addListener("onWarning", (message: unknown) => {
        if (typeof message === "string" && message.includes("poweredOn")) {
          subscription?.remove();
          BLEPeripheral.start().catch((err: unknown) => console.warn("[bleService] BLE 재시도 실패:", err));
        }
      });
    }
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
 */
export function scanForNearbyCodes(onFound: (code: string, rssi: number) => void): () => void {
  if (!bleManager) {
    console.warn("[bleService] 이 플랫폼에서는 BLE 스캔을 지원하지 않습니다.");
    return () => undefined;
  }

  let stopped = false;
  let stateSubscription: { remove: () => void } | null = null;

  const beginScan = () => {
    if (stopped) return;
    // scanMode는 Android 전용 옵션이라 iOS에서는 무시된다. LowLatency로 스캔 주기를 최대로 올려
    // 발견 속도를 높인다 (기본값은 LowPower라 최대 수 초까지 발견이 지연될 수 있었다).
    bleManager.startDeviceScan(null, { allowDuplicates: true, scanMode: ScanMode?.LowLatency }, handleScanResult);
  };

  // 앱을 막 열어 블루투스 권한을 처음 받은 직후처럼 BleManager의 상태가 아직 PoweredOn이
  // 아니면 startDeviceScan을 호출해도 조용히 아무것도 못 찾는다 — 화면을 나갔다 다시 들어와야
  // (=한 번 더 시도해야) 잡히던 증상이 바로 이거였다. 상태가 PoweredOn이 될 때까지 기다린 뒤 스캔한다.
  bleManager.state().then((state: string) => {
    if (stopped) return;
    if (state === "PoweredOn") {
      beginScan();
      return;
    }
    stateSubscription = bleManager!.onStateChange((next: string) => {
      if (next === "PoweredOn" && !stopped) {
        stateSubscription?.remove();
        stateSubscription = null;
        beginScan();
      }
    }, true);
  });

  function handleScanResult(error: any, device: any) {
    if (error) {
      console.warn("[bleService] scan error:", error.message);
      return;
    }
    if (!device || device.rssi == null) return;
    if (device.rssi < BLE_RSSI_THRESHOLD) return;

    // 우리 앱이 광고한 신호만 골라낸다 — 그 외 모든 주변 블루투스 기기(에어팟, 다른 앱 등)는
    // 아래 두 조건에 매치되지 않으므로 onFound가 호출되지 않고 목록에도 나타나지 않는다.
    //
    // Android 피어 판별: manufacturerData의 앞 2바이트(회사 ID, 리틀엔디안)가 BLE_COMPANY_ID(0xFFFF)와
    // 같은지 + serviceUUIDs에 우리 BLE_SERVICE_UUID가 같이 있는지 둘 다 확인한다. 회사 ID만 보면 오탐이
    // 난다 — 0xFFFF는 Bluetooth SIG가 "테스트 용도"로 예약해둔 값이라 주변의 다른 BLE 테스트 기기/앱도
    // 흔히 같은 값을 쓴다(특히 여러 팀이 동시에 BLE를 테스트하는 환경). serviceUUID까지 같이 요구해도
    // 안전한 이유 — 이건 Android가 broadcast()로 내보내는 광고 패킷 얘기라, uuid와 manufacturerData가
    // 애초에 한 패킷 안에 같이 실려 나가므로 스캔 쪽 콜백에도 항상 같이 도착한다(아래 iOS 피어 판별과는
    // 별개 — 그쪽은 serviceUUID만으로 판별하고 manufacturerData를 안 써서 이 얘기가 적용 안 됨).
    // 남은 4바이트가 실제 코드 — 앞의 2바이트(회사 ID)를 떼지 않고 그대로 hex 인코딩하면 8자리가
    // 아닌 12자리가 나와 서버에 잘못된 코드를 보내게 되는 버그가 있었다.
    if (device.manufacturerData != null) {
      const bytes = base64ToBytes(device.manufacturerData);
      const hasOurCompanyId =
        bytes.length >= 6 && bytes[0] === (BLE_COMPANY_ID & 0xff) && bytes[1] === ((BLE_COMPANY_ID >> 8) & 0xff);
      const serviceUuids: string[] = device.serviceUUIDs ?? [];
      const hasOurServiceUuid = serviceUuids.some((u) => u.toLowerCase() === BLE_SERVICE_UUID.toLowerCase());
      if (hasOurCompanyId && hasOurServiceUuid) {
        const code = bytesToHex(bytes.slice(-4));
        onFound(code, device.rssi);
        return;
      }
    }

    const serviceUuids: string[] = device.serviceUUIDs ?? [];
    const iosServiceUuid = serviceUuids.find((u) => u.toLowerCase().startsWith(IOS_SERVICE_UUID_PREFIX));
    if (iosServiceUuid) {
      onFound(iosServiceUuid.slice(-8), device.rssi);
    }
  }

  return () => {
    stopped = true;
    stateSubscription?.remove();
    bleManager?.stopDeviceScan();
  };
}
