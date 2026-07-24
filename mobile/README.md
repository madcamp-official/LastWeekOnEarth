# Mobile (React Native, Bare Workflow)

이 디렉토리는 JS/TS 소스만 담고 있습니다. **네이티브 `ios/`, `android/` 프로젝트는 아직 생성되지 않았습니다.**
BLE 네이티브 모듈(`react-native-ble-plx`)을 쓰려면 Bare workflow가 필요한데, Xcode/Android Studio가 설치된
로컬 환경에서 아래 순서로 직접 생성해야 합니다 (CLI가 실제 기기 툴체인을 요구하므로 이 스캐폴딩 세션에서는
생성하지 않았습니다).

## 최초 1회 설정

```bash
cd mobile
npm install

# 네이티브 프로젝트가 없으므로 RN 커뮤니티 CLI로 ios/android 생성
npx @react-native-community/cli init LastWeekOnEarth --directory tmp-init --version 0.75.4
# tmp-init/ios, tmp-init/android 를 이 디렉토리로 옮기고 tmp-init은 삭제
```

생성 후:
1. `ios/LastWeekOnEarth/Info.plist`에 CLAUDE.md 섹션 4-1의 Bluetooth 권한 키 추가
2. `android/app/src/main/AndroidManifest.xml`에 섹션 4-1의 BLUETOOTH 권한 추가
3. `cd ios && pod install`
4. `cp .env.example .env` 후 `API_BASE_URL`을 백엔드 주소로 설정

## 실행

```bash
npm run ios     # 또는
npm run android
```

## 디렉토리

- `src/screens` — 화면 단위 컴포넌트
- `src/components` — 재사용 UI 컴포넌트
- `src/services` — API 클라이언트(`api.ts`), BLE 서비스(`bleService.ts`)
- `src/store` — zustand 전역 상태
