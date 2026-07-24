# 주소록/BLE 기능 로컬 테스트 가이드

로그인 기능이 아직 없어도 아래 순서로 주소록(수동 등록 + BLE 태깅)을 실기기에서 바로 확인할 수 있다.

## 0. 준비물

- 백엔드: Docker (Postgres용), Node.js
- 모바일: Xcode(iOS) 그리고/또는 Android Studio(Android). **BLE 태깅을 실제로 확인하려면 최소 한 대는
  Android 실기기여야 한다** (iOS는 BLE 광고를 지원하지 않음 — 아래 "알려진 제약" 참고). 시뮬레이터/에뮬레이터는
  실제 BLE 라디오가 없어 두 기기 간 태깅 자체는 확인 불가하고, 화면/API 연동까지만 확인 가능하다.

## 1. 백엔드 띄우기

```bash
cd backend
cp .env.example .env
docker compose -f ../docker-compose.yml up -d postgres
npm install
npx prisma migrate dev
npm run seed          # alice, bob 테스트 유저 생성
npm run dev            # http://localhost:4000
```

다른 터미널에서 테스트용 accessToken 발급:

```bash
npm run dev:token -- alice
# userId: ...
# accessToken: eyJ...   <- 이 값을 모바일 앱에 붙여넣을 것
```

## 2. 모바일 앱 준비

```bash
cd mobile
npm install
```

**iOS** (Mac + Xcode 필요):
```bash
cd ios
bundle install          # 최초 1회
bundle exec pod install
cd ..
npm run ios
```

**Android** (Android Studio + SDK 필요):
```bash
npm run android
```

앱 실행 후 첫 화면(임시 로그인)에 1단계에서 받은 accessToken을 붙여넣으면 주소록 화면으로 들어간다.

### 백엔드 주소 맞추기 (`mobile/src/config.ts`)

- iOS 시뮬레이터: 기본값(`localhost`)으로 바로 동작
- Android 에뮬레이터: 기본값(`10.0.2.2`)으로 바로 동작
- **실기기(iOS/Android 공통)**: 맥과 같은 네트워크에 연결한 뒤, 맥의 LAN IP로 `DEV_HOST`를 바꿔야 한다
  ```bash
  ipconfig getifaddr en0   # 맥 LAN IP 확인
  ```
  `mobile/src/config.ts`의 `DEV_HOST`를 이 IP로 바꾸고 앱을 다시 빌드/리로드.

## 3. 기능별 확인 순서

1. **수동 등록**: 주소록 화면 → `+ 수동 등록` → 이름/소속/이메일/전화/메모 입력 → 등록 → 목록에 뜨는지 확인
2. **상세/로그**: 목록에서 항목 탭 → 상세 화면 → `연락했음으로 기록` → 연락 이력에 쌓이는지 확인
3. **삭제**: 상세 화면 → `삭제` → 목록에서 사라지는지 확인
4. **BLE 태깅** (Android 기기 1대 + 아무 기기 1대, 최소 한쪽은 Android):
   - 두 기기 모두 1단계 accessToken을 서로 다른 계정(alice/bob)으로 로그인
   - Android 기기(예: bob)에서 `주변 기기로 태깅` → `내 프로필 광고 시작`
   - 다른 기기(예: alice)에서 `주변 기기로 태깅` → `주변 기기 스캔 시작` → bob이 목록에 뜨면 `태깅`
   - alice의 주소록에 bob이 `source: BLE`로 등록됐는지 확인
   - 같은 기기를 다시 스캔+태깅해도 중복 생성되지 않고 갱신만 되는지 확인 (`docs/openapi.yaml`의 `ble-tag` 200/201 구분과 동일)

## 알려진 제약 (지금은 넘어가기로 함)

- **iOS는 BLE 광고를 지원하지 않는다.** iOS CoreBluetooth의 `CBPeripheralManager startAdvertising:`은
  서비스 UUID와 로컬 이름만 실을 수 있고 커스텀 payload(우리 태깅 코드)는 실을 수 없다 — 라이브러리 문제가
  아니라 Apple 플랫폼 자체 제약이다 (`node_modules/react-native-ble-advertiser/ios/BLEAdvertiser.m` 확인,
  `payload` 인자가 실제로는 쓰이지 않음). 로컬 이름(local name) 필드에 코드를 실어 우회하는 방법이
  이론적으로 있지만, 네이티브 코드를 새로 작성/패치해야 하고 이 환경에선 Xcode가 없어 컴파일 검증이
  불가능해 보류했다. iOS는 스캔(태깅 받기)만 가능하고, 광고(태깅 당하기)는 Android에서만 가능하다.
- Firebase(푸시 알림)는 아직 네이티브 설정(`google-services.json` 등)이 없어 의존성 자체를 뺐다.
  Phase 3(알림) 구현 시 다시 추가할 것.
- `DevLoginScreen`은 임시다. 실제 로그인 기능이 들어오면 삭제하고 정식 로그인 화면으로 교체한다.
