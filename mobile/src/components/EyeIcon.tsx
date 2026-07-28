import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

interface EyeIconProps {
  visible: boolean;
  color: string;
  size?: number;
}

export function EyeIcon({ visible, color, size = 20 }: EyeIconProps) {
  if (visible) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M2 12C4 7.5 7.7 5 12 5s8 2.5 10 7c-2 4.5-5.7 7-10 7s-8-2.5-10-7Z"
          stroke={color}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx="12" cy="12" r="2.8" stroke={color} strokeWidth={1.7} />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 3.5L20.5 20.5"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      <Path
        d="M6.5 6.9C4.5 8.2 3 10 2 12c2 4.5 5.7 7 10 7 1.6 0 3.1-.35 4.4-1M10.2 5.3C10.8 5.1 11.4 5 12 5c4.3 0 8 2.5 10 7-.6 1.35-1.4 2.55-2.35 3.55"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.9 10.1a2.8 2.8 0 0 0 3.95 3.95"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
