import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

interface IconProps {
  size?: number;
  color: string;
  strokeWidth?: number;
}

// 이모지는 OS/제조사별로 모양이 완전히 달라 보여서(특히 🗑📥👥🔍) 아이콘은 전부 이 파일의
// stroke 기반 SVG로 통일한다 — TabIcon/BackButton과 같은 스타일 규칙(24x24 viewBox, round cap/join).
export function SearchIcon({ size = 16, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="10.5" cy="10.5" r="6.5" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M19.5 19.5L15 15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function TrashIcon({ size = 16, color, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 7h15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path
        d="M9.5 7V4.8c0-.44.36-.8.8-.8h3.4c.44 0 .8.36.8.8V7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6.5 7l.9 12.1c.05.65.6 1.15 1.25 1.15h6.7c.65 0 1.2-.5 1.25-1.15L17.5 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M10.3 10.5v6.3M13.7 10.5v6.3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

// "나를 등록한 사람" — 원래 받은함(tray+화살표) 모양이었는데 18px에서 path 3개가 겹쳐 보여
// 알아보기 어려웠다. "사람 + plus 배지"(person-add) 모양이 "누군가 나를 추가했다"는 의미를
// 더 직관적으로 전달하고, 획 밀도도 낮아 작은 크기에서 더 또렷하다.
export function InboxIcon({ size = 16, color, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7.4" r="3.2" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M3 19.4c0-3.6 2.6-6.1 6-6.1s6 2.5 6 6.1"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path d="M19 9.4v6M16 12.4h6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

// "그룹" — 원래 3명이 모인 모양이었는데 인맥 탭의 2인 아이콘(TabIcon "contacts")과 실루엣이
// 너무 비슷해 한눈에 구분이 안 됐다. 사람 모양 대신 "쌓인 레이어" 모티프로 바꿔 "여러 개를 묶어
// 놓은 것"(그룹핑)이라는 의미를 사람 아이콘과 겹치지 않는 형태로 표현한다.
export function GroupIcon({ size = 16, color, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.2L3.5 7.6L12 12L20.5 7.6L12 3.2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M3.5 12.4L12 16.8L20.5 12.4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3.5 17.2L12 21.6L20.5 17.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CheckIcon({ size = 14, color, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 12.5l5 5 10-10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function BellIcon({ size = 16, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 10.2c0-3.3 2.7-6 6-6s6 2.7 6 6v3.2l1.6 3.1H4.4L6 13.4V10.2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9.6 19.4a2.4 2.4 0 0 0 4.8 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function SendIcon({ size = 16, color, strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12L20 4l-6.5 16-3-6.5L4 12Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChatIcon({ size = 16, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5.5h16v10.2H9.8L5.5 19V15.7H4V5.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PhotoIcon({ size = 16, color, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6h16v12H4V6Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="9" cy="10.5" r="1.6" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M4 16.5l5-4.5 4 3.5 3-2.5 4 3.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ProfileCardIcon({ size = 16, color, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="9" r="3" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M4 18c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M15.5 8.5h4M15.5 12h4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 16, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 5l14 14M19 5L5 19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function DownloadIcon({ size = 16, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.5v11.5M7.5 11l4.5 4.5L16.5 11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4.5 17v2.3c0 .66.54 1.2 1.2 1.2h12.6c.66 0 1.2-.54 1.2-1.2V17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function DragHandleIcon({ size = 16, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h16M4 12h16M4 17h16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function PlusIcon({ size = 16, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
