import React, { useState } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { GRADIENT_STOPS } from "../theme/colors";

interface GradientViewProps {
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  children?: React.ReactNode;
}

let gradientIdSeq = 0;

// expo-linear-gradient 미설치라 이미 있는 react-native-svg로 대각선 violet→blue→pink
// 그라디언트를 흉내낸다. width/height를 퍼센트로 주고 네 변을 모두 0으로 고정해서 부모 박스를
// 정확히 채운다 — 예전엔 onLayout으로 잰 픽셀 크기를 썼는데, 측정값이 실제 박스보다 소수점만큼
// 작게 나오는 기기에서 아래쪽에 얇게 안 채워진 줄이 남아 원이 살짝 잘린 것처럼 보였다.
export function GradientView({ style, borderRadius = 0, children }: GradientViewProps) {
  const [gradientId] = useState(() => `anchoraGradient${gradientIdSeq++}`);

  return (
    <View style={style}>
      <Svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={GRADIENT_STOPS[0]} />
            <Stop offset="55%" stopColor={GRADIENT_STOPS[1]} />
            <Stop offset="100%" stopColor={GRADIENT_STOPS[2]} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" rx={borderRadius} ry={borderRadius} fill={`url(#${gradientId})`} />
      </Svg>
      {children}
    </View>
  );
}
