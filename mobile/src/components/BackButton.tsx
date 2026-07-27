import React from "react";
import { Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../theme/colors";

interface BackButtonProps {
  onPress: () => void;
}

export function BackButton({ onPress }: BackButtonProps) {
  return (
    <Pressable style={styles.button} onPress={onPress} hitSlop={8}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M15 6l-6 6 6 6" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
});
