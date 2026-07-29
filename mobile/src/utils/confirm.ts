import { Alert, Platform } from "react-native";

/**
 * react-native-web의 Alert.alert는 아무 동작도 하지 않는 no-op이라 버튼 콜백이 절대 호출되지 않는다.
 * 웹에서는 window.confirm으로 대체하고, 네이티브에서는 기존 Alert.alert(확인/취소)를 사용한다.
 */
export function confirmAction(title: string, onConfirm: () => void, confirmLabel = "삭제") {
  if (Platform.OS === "web") {
    const webConfirm = (globalThis as { confirm?: (message: string) => boolean }).confirm;
    if (webConfirm?.(title)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, undefined, [
    { text: "취소", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}

/**
 * confirmAction과 동일하지만 삭제류가 아닌 긍정 액션(등록 등)용 — iOS에서 destructive 스타일(빨간
 * 글씨)로 그려지지 않도록 별도로 분리했다.
 */
export function confirmPositive(title: string, onConfirm: () => void, confirmLabel = "확인") {
  if (Platform.OS === "web") {
    const webConfirm = (globalThis as { confirm?: (message: string) => boolean }).confirm;
    if (webConfirm?.(title)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, undefined, [
    { text: "취소", style: "cancel" },
    { text: confirmLabel, onPress: onConfirm },
  ]);
}

/**
 * 버튼 없는 단순 알림. react-native-web의 Alert.alert는 no-op이라 web에서는 window.alert로 대체한다.
 */
export function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    (globalThis as { alert?: (message: string) => void }).alert?.(message ? `${title}\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
