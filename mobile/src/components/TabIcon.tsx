import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "../theme/colors";

export type TabIconName = "contacts" | "ble" | "mail" | "post" | "mypage";

interface TabIconProps {
  name: TabIconName;
  active: boolean;
}

// 활성 탭은 violet 단색으로 표시한다(디자인 원본은 그라디언트 stroke를 쓰지만, 아이콘마다
// 매번 새 SVG gradient def를 만들어야 해서 배보다 배꼽이 커짐 — 단색으로도 충분히 표현됨).
export function TabIcon({ name, active }: TabIconProps) {
  const stroke = active ? colors.violet : colors.faint;
  const size = 22;

  switch (name) {
    // 원래 handshake.png(PNG + tintColor)를 썼는데, Android에서 tintColor가 PNG 알파채널을
    // iOS와 다르게 처리해서 아이콘이 거의 안 보이는 문제가 있었다 — 다른 탭과 같은 방식(사람 두 명을
    // 나타내는 SVG selection stroke)으로 바꿔서 두 플랫폼에서 동일하게 렌더링되도록 한다.
    case "contacts":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="9" cy="8" r="2.8" stroke={stroke} strokeWidth={1.7} />
          <Path
            d="M3.5 19.5c0-3.5 2.4-6 5.5-6s5.5 2.5 5.5 6"
            stroke={stroke}
            strokeWidth={1.7}
            strokeLinecap="round"
          />
          <Circle cx="17" cy="9" r="2.2" stroke={stroke} strokeWidth={1.7} />
          <Path
            d="M14.5 19.5c0-2.7 1.7-4.6 4-4.6s3.8 1.6 4 4"
            stroke={stroke}
            strokeWidth={1.7}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "ble":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="5" r="1.8" stroke={stroke} strokeWidth={1.7} />
          <Path
            d="M12 7V17M12 17C9 17 8 15.3 8 13.6M12 17C15 17 16 15.3 16 13.6"
            stroke={stroke}
            strokeWidth={1.7}
            strokeLinecap="round"
          />
          <Path d="M5.5 10.5H9M15 10.5H18.5" stroke={stroke} strokeWidth={1.7} strokeLinecap="round" />
        </Svg>
      );
    case "mail":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="6" width="18" height="13" rx="2.5" stroke={stroke} strokeWidth={1.7} />
          <Path d="M4 7.5L12 13.5L20 7.5" stroke={stroke} strokeWidth={1.7} strokeLinecap="round" />
        </Svg>
      );
    case "post":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="4" y="3.5" width="16" height="17" rx="2.5" stroke={stroke} strokeWidth={1.7} />
          <Path d="M8 8.5H16M8 12H16M8 15.5H12.5" stroke={stroke} strokeWidth={1.7} strokeLinecap="round" />
        </Svg>
      );
    case "mypage":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="8" r="3.6" stroke={stroke} strokeWidth={1.7} />
          <Path d="M4.5 20c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7" stroke={stroke} strokeWidth={1.7} strokeLinecap="round" />
        </Svg>
      );
  }
}
