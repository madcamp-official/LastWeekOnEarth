import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { GradientView } from "./GradientView";

const RING_DELAYS = [0, 660, 1320];
const RING_SIZE = 220;

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
              opacity: value.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.55, 0.35, 0] }),
              transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.9] }) }],
            },
          ]}
        >
          <GradientView style={StyleSheet.absoluteFill} borderRadius={RING_SIZE / 2} />
        </Animated.View>
      ))}
      <View style={styles.center}>
        <GradientView style={styles.centerGradient} borderRadius={50}>
          <BleGlyph />
        </GradientView>
      </View>
    </View>
  );
}

function BleGlyph() {
  return (
    <View style={styles.glyphWrap}>
      <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="5" r="2.4" stroke="#fff" strokeWidth={1.8} />
        <Path
          d="M12 7.5V14M12 14C7.5 14 6 11.5 6 9M12 14C16.5 14 18 11.5 18 9"
          stroke="#fff"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <Path d="M4 9H8M16 9H20" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2 },
  center: { width: 100, height: 100, borderRadius: 50, zIndex: 2 },
  centerGradient: { width: 100, height: 100, alignItems: "center", justifyContent: "center" },
  glyphWrap: { alignItems: "center", justifyContent: "center" },
});
