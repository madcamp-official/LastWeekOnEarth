import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";

interface SolidButtonViewProps {
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  children?: React.ReactNode;
}

// GradientView와 동일한 props 모양의 단색 버튼 배경. BLE 탭을 제외한 모든 화면의 버튼/활성 칩은
// 그라디언트 대신 이 violet 단색(#8B5CF6)으로 통일한다.
export function SolidButtonView({ style, borderRadius = 0, children }: SolidButtonViewProps) {
  return <View style={[style, { backgroundColor: colors.violet, borderRadius }]}>{children}</View>;
}
