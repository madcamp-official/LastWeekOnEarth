# Mobile (React Native, Bare Workflow)

이 디렉토리는 JS/TS 소스만 담고 있습니다. **네이티브 `ios/`, `android/` 프로젝트는 아직 생성되지 않았습니다.**
BLE 네이티브 모듈(`react-native-ble-plx`, `react-native-ble-advertiser`)을 쓰려면 Bare workflow가 필요한데,
Xcode/Android Studio가 설치된 로컬 환경에서 아래 순서로 직접 생성해야 합니다 (CLI가 실제 기기 툴체인을
요구하므로 이 스캐폴딩 세션에서는 생성하지 않았습니다).

## BLE 아키텍처 (구현하며 CLAUDE.md에서 바뀐 부분)

- **`react-native-ble-plx`는 Central(스캔) 전용입니다.** Peripheral(광고) API가 없어 CLAUDE.md 0-1의
  "central/peripheral 양방향 지원" 전제와 다릅니다. 광고는 Android에서 `react-native-ble-advertiser`로 처리합니다.
- **iOS는 광고를 지원하지 않습니다.** iOS용 CoreBluetooth 광고는 네이티브(Swift) 모듈이 필요한데, 이 환경엔
  Xcode가 없어 검증 못 한 코드를 넣는 대신 스캔만 지원하도록 의도적으로 제한했습니다
  (`src/services/bleService.ts`의 `startAdvertising`). 즉 두 기기가 서로 태깅하려면 최소 한쪽이 Android여야 합니다.
- **BLE 토큰은 JWT가 아니라 8자리 hex 코드입니다.** BLE 광고 패킷 용량(~20~24바이트) 때문에 200자 넘는 JWT를
  실을 수 없어 서버가 짧은 코드를 발급하고 메모리에서 매핑합니다 (`backend/src/lib/bleCodeStore.ts`).
- 스캔/광고 모두 고정 서비스 UUID(`BLE_SERVICE_UUID` in `bleService.ts`)로 우리 앱만 식별합니다.

## 최초 1회 설정

```bash
cd mobile
npm install

# 네이티브 프로젝트가 없으므로 RN 커뮤니티 CLI로 ios/android 생성
npx @react-native-community/cli init LastWeekOnEarth --directory tmp-init --version 0.75.4
# tmp-init/ios, tmp-init/android 를 이 디렉토리로 옮기고 tmp-init은 삭제
```

생성 후 아래 권한을 추가하세요 (CLAUDE.md 섹션 4-1과 동일):

**`ios/LastWeekOnEarth/Info.plist`**
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>주변 사용자와 명함을 교환하기 위해 블루투스를 사용합니다.</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>내 프로필을 주변 기기에 알리기 위해 블루투스를 사용합니다.</string>
<key>UIBackgroundModes</key>
<array>
  <string>bluetooth-central</string>
  <string>bluetooth-peripheral</string>
</array>
```

**`android/app/src/main/AndroidManifest.xml`**
```xml
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<!-- Android 12 미만 기기 호환용 -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

이어서:
1. `cd ios && pod install`
2. `cp .env.example .env` 후 `API_BASE_URL`을 백엔드 주소로 설정

런타임 권한 요청(Android 12+는 `BLUETOOTH_SCAN`/`BLUETOOTH_ADVERTISE`/`BLUETOOTH_CONNECT`, 그 미만은
위치 권한)은 `bleService.ensureBlePermissions()`가 처리하며 `BleTagScreen`에서 스캔/광고 시작 전에 호출한다.
iOS는 Info.plist 설정만으로 시스템이 최초 스캔 시도 시 자동으로 팝업을 띄운다.

## 실행

```bash
npm run ios     # 또는
npm run android
```

## 실기기 테스트 체크리스트 (이 환경에서는 검증 불가)

- Android ↔ Android: A가 광고 시작 → B가 스캔 → B에서 태깅 → 서로 반대로도 수행
- Android ↔ iOS: Android만 광고 가능, iOS는 스캔해서 태깅만 가능 (반대 방향은 불가)
- RSSI 임계값(-50dBm)이 실제 기기 간격에서 적절한지 실측 후 `BLE_RSSI_THRESHOLD` 조정

## 디렉토리

- `src/screens` — `ContactsListScreen`(목록), `AddContactScreen`(수동 등록), `ContactDetailScreen`(상세/로그),
  `BleTagScreen`(광고·스캔·태깅)
- `src/navigation` — `RootNavigator`, 스택 파라미터 타입
- `src/services` — API 클라이언트(`api.ts`, `contactsApi.ts`), BLE 서비스(`bleService.ts`)
- `src/store` — zustand 전역 상태 (accessToken 등, 로그인 기능 완성 시 실제 값이 채워짐)
