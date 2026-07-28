// Expo Push API — expo-server-sdk 없이 fetch만으로 호출한다 (배치당 최대 100개 권장이지만
// 우리 스케일에선 매번 소량이라 단순 개별 호출로 충분).
export async function sendExpoPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!expoPushToken.startsWith("ExponentPushToken")) return;

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: expoPushToken, sound: "default", title, body, data }),
  });

  if (!response.ok) {
    console.error(`[expoPush] 발송 실패 (${response.status}): ${await response.text()}`);
  }
}
