// Anchora 디자인 시스템 토큰. 프로토타입(Claude Design)은 oklch()를 쓰지만 RN StyleSheet가
// oklch를 지원하지 않아 근사 hex로 변환했다. violet/blue/pink 세 값은 프로토타입 SVG 그라디언트
// stop에 그대로 적힌 값이라 정확하다.
export const colors = {
  violet: "#8B5CF6",
  blue: "#5B8EF2",
  pink: "#EC6BB0",
  bg: "#EDEAF3",
  card: "#FFFFFF",
  ink: "#241F2E",
  sub: "#726D7D",
  faint: "#A6A2AC",
  line: "#E6E3EA",
  danger: "#D6432E",
  success: "#3FA35C",
  violetSoft: "#EFE9FA",
  blueSoft: "#E9EEFB",
  pinkSoft: "#FAE9F0",
} as const;

// 그라디언트가 필요한 곳(버튼/원형 배지 등)에서 GradientView와 함께 쓴다.
export const GRADIENT_STOPS = [colors.violet, colors.blue, colors.pink] as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;
