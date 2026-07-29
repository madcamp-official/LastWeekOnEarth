import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../theme/colors";

export interface ActionSheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  options: ActionSheetOption[];
}

// react-native의 기본 Alert.alert는 안드로이드/iOS가 버튼을 서로 다른 네이티브 스타일로 그려서
// (특히 안드로이드는 버튼 사이 간격이 넓고 위치도 매번 달라 보임), 옵션이 여러 개일 때 두 플랫폼에서
// 똑같이 깔끔하게 보이도록 직접 그리는 하단 시트로 대체한다 — iOS 액션시트 스타일(옵션 카드 + 취소
// 카드가 분리된 형태)을 두 플랫폼에서 동일하게 재현한다.
export function ActionSheet({ visible, onClose, options }: ActionSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.sm }]} onPress={() => undefined}>
          <View style={styles.card}>
            {options.map((option, index) => (
              <Pressable
                key={option.label}
                style={[styles.row, index < options.length - 1 && styles.rowDivider]}
                onPress={() => {
                  onClose();
                  option.onPress();
                }}
              >
                <Text style={[styles.rowText, option.destructive && styles.rowTextDestructive]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.cancelCard} onPress={onClose}>
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(20,17,26,0.45)", justifyContent: "flex-end" },
  sheet: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: "hidden" },
  row: { paddingVertical: 16, alignItems: "center" },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowText: { fontSize: 16, fontWeight: "600", color: colors.violet },
  rowTextDestructive: { color: colors.danger },
  cancelCard: { backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: 16, alignItems: "center" },
  cancelText: { fontSize: 16, fontWeight: "700", color: colors.ink },
});
