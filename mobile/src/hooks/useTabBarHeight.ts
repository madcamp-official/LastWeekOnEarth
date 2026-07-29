import { useSafeAreaInsets } from "react-native-safe-area-context";

// RootNavigator의 tabBarStyle height 계산과 반드시 값을 맞춰야 한다 — 하단 탭이 있는 화면의
// 스크롤 콘텐츠가 탭바에 가려지지 않도록 마지막 항목 아래에 이 만큼 여백을 더해준다.
export function useTabBarHeight() {
  const insets = useSafeAreaInsets();
  return 56 + insets.bottom;
}
