import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";
import { GradientView } from "./GradientView";

const RING_DELAYS = [0, 660, 1320];
// 스캔 취소(idle) 상태의 로고 원(BleTagScreen.tsx의 idleOuter/idleLogo)과 같은 자리에 뜨도록 전체
// 영역(CONTAINER_SIZE)은 그대로 180으로 맞추되, 파형은 로고 자체(LOGO_SIZE)에서 시작한다 — 이전엔
// 로고 바깥에 violetSoft 배경 원(180px)이 따로 있어서, 파형이 로고가 아니라 그 배경 원 가장자리에서
// 시작하는 것처럼 보였다(=로고를 원이 감싸고 있는 느낌). 배경 원을 없애고 로고 크기에서 바로
// 시작하게 하면 "로고에서 파형이 뻗어나가는" 느낌이 된다.
const CONTAINER_SIZE = 180;
const LOGO_SIZE = 120;

/**
 * BLE 스캔 중 화면에 나오는 레이더 펄스. 디자인 원본(anchoraPulse keyframe)은 CSS 애니메이션이라
 * RN에서는 Animated.loop 3개를 660ms씩 어긋나게 시작해서 흉내낸다.
 */
export function RadarPulse() {
  const values = useRef(RING_DELAYS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const timers = values.map((value, i) => {
      const loop = Animated.loop(
        Animated.timing(value, { toValue: 1, duration: 2000, useNativeDriver: true }),
      );
      const timer = setTimeout(() => {
        value.setValue(0);
        loop.start();
      }, RING_DELAYS[i]);
      return { timer, loop };
    });
    return () => {
      timers.forEach(({ timer, loop }) => {
        clearTimeout(timer);
        loop.stop();
      });
    };
  }, [values]);

  return (
    <View style={styles.container}>
      {values.map((value, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              opacity: value.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.6, 0.45, 0] }),
              transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 3.4] }) }],
            },
          ]}
        >
          <GradientView style={StyleSheet.absoluteFill} borderRadius={LOGO_SIZE / 2} />
        </Animated.View>
      ))}
      <View style={styles.center}>
        <Image source={require("../../assets/Anchora_main.png")} style={styles.centerLogo} resizeMode="cover" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: CONTAINER_SIZE, height: CONTAINER_SIZE, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: LOGO_SIZE / 2 },
  center: { width: LOGO_SIZE, height: LOGO_SIZE, zIndex: 2 },
  centerLogo: { width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: LOGO_SIZE / 2 },
});
