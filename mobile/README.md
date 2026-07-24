# Mobile (React Native, Bare Workflow)

`ios/`, `android/` 네이티브 프로젝트가 생성되어 있습니다 (RN 0.75.4 템플릿 기준). 실행하려면 로컬에
Xcode(iOS)와 Android Studio/SDK(Android)가 있어야 합니다 — 이 프로젝트를 만든 세션에는 둘 다 없어서
빌드/실행 자체는 검증하지 못했고, JS/TS 타입체크까지만 확인했습니다. 자세한 실행·테스트 순서는
[../docs/testing-guide.md](../docs/testing-guide.md) 참고.

## BLE 아키텍처 (구현하며 CLAUDE.md에서 바뀐 부분)

- **`react-native-ble-plx`는 Central(스캔) 전용입니다.** Peripheral(광고) API가 없어 CLAUDE.md 0-1의
  "central/peripheral 양방향 지원" 전제와 다릅니다. 광고는 Android에서 `react-native-ble-advertiser`로 처리합니다.
- **iOS는 광고를 지원하지 않습니다 (확인된 플랫폼 제약).** `react-native-ble-advertiser`의 iOS 네이티브
  코드(`node_modules/react-native-ble-advertiser/ios/BLEAdvertiser.m`)를 직접 읽어봤는데, iOS의
  `CBPeripheralManager startAdvertising:`은 서비스 UUID/로컬 이름만 실을 수 있고 커스텀 payload(우리
  태깅 코드)는 애초에 실을 방법이 없습니다 — 이 라이브러리만의 문제가 아니라 Apple CoreBluetooth 자체
  제약입니다. 로컬 이름(local name) 필드에 코드를 우겨넣는 우회책이 이론적으로 있지만, 네이티브 코드를
  새로 짜거나 패치해야 하고 이 환경엔 Xcode가 없어 컴파일 검증이 불가능해 보류했습니다. 그래서 iOS는
  스캔(태깅 받기)만, 광고(태깅 당하기)는 Android에서만 가능합니다 — 두 기기가 서로 태깅하려면 최소
  한쪽이 Android여야 합니다.
- **BLE 토큰은 JWT가 아니라 8자리 hex 코드입니다.** BLE 광고 패킷 용량(~20~24바이트) 때문에 200자 넘는 JWT를
  실을 수 없어 서버가 짧은 코드를 발급하고 메모리에서 매핑합니다 (`backend/src/lib/bleCodeStore.ts`).
- 스캔/광고 모두 고정 서비스 UUID(`BLE_SERVICE_UUID` in `bleService.ts`)로 우리 앱만 식별합니다.
- Android 12+ 런타임 권한(`BLUETOOTH_SCAN`/`ADVERTISE`/`CONNECT`)은 `bleService.ensureBlePermissions()`가
  처리하며, `BleTagScreen`이 스캔/광고 시작 전에 호출합니다.

## 로그인 기능 없이 테스트하기

로그인/OTP가 아직 스텁이라, 앱 첫 화면은 `DevLoginScreen`(임시 로그인)입니다. 백엔드에서
`npm run dev:token -- alice`로 받은 accessToken을 붙여넣으면 주소록 화면으로 들어갑니다. 다른 계정으로
바꾸려면 주소록 화면의 "다른 계정 토큰으로 전환" 버튼으로 초기화 후 다시 붙여넣으면 됩니다. 실제 로그인
기능이 완성되면 `DevLoginScreen`과 `backend/scripts/dev-token.ts`는 지우고 정식 로그인 화면으로 교체하세요.

## 뺀 것 (지금 단계에서 불필요한 리스크라 판단)

- **`@react-native-firebase/*`**: 푸시 알림(Phase 3)은 아직 구현 안 했고, `google-services.json` 등 네이티브
  설정 없이 두면 Android Gradle 빌드가 깨질 수 있어 의존성 자체를 뺐습니다. 알림 기능 구현 시 다시 추가.
- **`react-native-config`**: 네이티브 빌드 스크립트 연동이 추가로 필요한데, 이미 네이티브 셋업이 많은
  프로젝트라 리스크만 늘어난다고 판단. 대신 `src/config.ts`에서 플랫폼별 기본 호스트를 상수로 관리합니다
  (에뮬레이터는 기본값으로 동작, 실기기는 직접 IP를 바꿔야 함 — `docs/testing-guide.md` 참고).

## 최초 1회 설정

```bash
cd mobile
npm install
```

**iOS**
```bash
cd ios
bundle install          # 최초 1회, Gemfile에 CocoaPods 버전 고정돼 있음
bundle exec pod install
cd ..
```

**Android**: 별도 설치 스텝 없음 (Gradle autolinking). `ANDROID_HOME`/SDK, 에뮬레이터 또는 실기기만 준비.

## 실행

```bash
npm run ios     # 또는
npm run android
```

## 알려진 빌드 리스크 (미검증 — Xcode/Android Studio 있는 환경에서 확인 필요)

- `react-native-ble-advertiser`의 Android 모듈이 `compileSdkVersion 28`로 고정돼 있어, 루트 프로젝트의
  최신 SDK 버전과 Gradle 동기화 시 충돌할 가능성이 있습니다. 문제가 생기면 해당 모듈만 SDK 버전을
  맞추는 패치가 필요할 수 있습니다.
- iOS `pod install`은 CocoaPods가 필요합니다 (`bundle exec pod install`). 이 세션의 시스템 Ruby(2.6)가
  너무 낮아 여기서는 설치를 못 해봤습니다 — Homebrew Ruby 등 최신 Ruby가 있는 로컬 환경에서는 문제없을
  겁니다.

## 디렉토리

- `src/screens` — `DevLoginScreen`(임시 로그인), `ContactsListScreen`(목록), `AddContactScreen`(수동 등록),
  `ContactDetailScreen`(상세/로그), `BleTagScreen`(광고·스캔·태깅)
- `src/navigation` — `RootNavigator`(accessToken 유무로 화면 분기), 스택 파라미터 타입
- `src/services` — API 클라이언트(`api.ts`, `contactsApi.ts`), BLE 서비스(`bleService.ts`)
- `src/store` — zustand 전역 상태 (accessToken 등)
- `src/config.ts` — 백엔드 API 주소 (기기별로 직접 수정)
