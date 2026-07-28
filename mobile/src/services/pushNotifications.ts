import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * 연락 리마인더 등 푸시 알림을 받기 위해 기기 권한을 요청하고 Expo push token을 서버에 등록한다.
 * 실기기가 아니거나(에뮬레이터) 권한을 거부하면 조용히 스킵한다 — 필수 기능이 아니라서 막지 않는다.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  if (!Device.isDevice) return;

  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync();
    await api.put("/users/me/push-token", { expoPushToken });
  } catch (err) {
    console.warn("푸시 알림 등록 실패:", err);
  }
}
