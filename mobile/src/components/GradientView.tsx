import React, { useState } from "react";
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { GRADIENT_STOPS } from "../theme/colors";

interface GradientViewProps {
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  children?: React.ReactNode;
}

let gradientIdSeq = 0;

// expo-linear-gradient 미설치라 이미 있는 react-native-svg로 대각선 violet→blue→pink
// 그라디언트를 흉내낸다. 자기 레이아웃 크기를 onLayout으로 재서 그 크기에 맞는 Svg를 겹쳐 그린다.
export function GradientView({ style, borderRadius = 0, children }: GradientViewProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [gradientId] = useState(() => `anchoraGradient${gradientIdSeq++}`);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  return (
    <View style={style} onLayout={onLayout}>
      {size.width > 0 && size.height > 0 && (
        <Svg width={size.width} height={size.height} style={{ position: "absolute", top: 0, left: 0 }}>
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={GRADIENT_STOPS[0]} />
              <Stop offset="55%" stopColor={GRADIENT_STOPS[1]} />
              <Stop offset="100%" stopColor={GRADIENT_STOPS[2]} />
            </LinearGradient>
          </Defs>
          <Rect width={size.width} height={size.height} rx={borderRadius} ry={borderRadius} fill={`url(#${gradientId})`} />
        </Svg>
      )}
      {children}
    </View>
  );
}
