import React, { useCallback, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import axios from "axios";
import { gmailApi, type GmailStatus } from "../services/gmailApi";
import { confirmAction, notify } from "../utils/confirm";
import { SolidButtonView } from "../components/SolidButtonView";
import { colors, radius, spacing } from "../theme/colors";

function extractErrorMessage(err: unknown): string {
  return axios.isAxiosError(err) && err.response?.data?.error ? err.response.data.error : "요청 처리 중 오류가 발생했습니다.";
}

// 메일함 > 설정. "내 대신 Gmail 발송" 권한을 앱 안에서 직접 켜고 끌 수 있게 한다.
// 테스트 모드에서는 서버 허용 목록(GMAIL_ALLOWED_TEST_EMAILS)에 없는 계정이면 연동이 막혀있다.
export function GmailSettingsScreen() {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await gmailApi.status());
    } catch (err) {
      notify("상태를 불러오지 못했습니다.", extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { consentUrl } = await gmailApi.connect();
      if (Platform.OS === "web") {
        await Linking.openURL(consentUrl);
      } else {
        await WebBrowser.openBrowserAsync(consentUrl);
      }
      notify("Google 동의 화면에서 승인 후 이 화면으로 돌아와 새로고침해주세요.");
    } catch (err) {
      notify("연동 실패", extractErrorMessage(err));
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    confirmAction(
      "Gmail 발송 연동을 해제하시겠습니까?",
      async () => {
        await gmailApi.disconnect();
        await load();
      },
      "연동 해제",
    );
  };

  if (loading && !status) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gmail 발송 연동</Text>
      <Text style={styles.desc}>
        Google 계정을 Anchora와 연동하면 메일함의 초안을 내 Gmail 계정으로 실제 발송/예약 발송할 수 있어요. 현재는 테스트 모드라 허용된
        계정만 연동할 수 있어요.
      </Text>

      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: status?.connected ? colors.success : colors.faint }]} />
          <Text style={styles.statusText}>{status?.connected ? "연동됨" : "연동 안 됨"}</Text>
        </View>
        {status?.connected && status.grantedEmail && (
          <Text style={styles.grantedEmail}>{status.grantedEmail}</Text>
        )}
      </View>

      {status?.connected ? (
        <Pressable style={[styles.button, styles.danger]} onPress={handleDisconnect}>
          <Text style={styles.buttonText}>연동 해제</Text>
        </Pressable>
      ) : (
        <Pressable onPress={handleConnect} disabled={connecting}>
          <SolidButtonView style={styles.button} borderRadius={radius.md}>
            {connecting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Gmail 연동하기</Text>}
          </SolidButtonView>
        </Pressable>
      )}

      <Pressable style={styles.refreshLink} onPress={load}>
        <Text style={styles.refreshLinkText}>상태 새로고침</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  title: { fontSize: 20, fontWeight: "800", color: colors.ink, marginTop: spacing.md },
  desc: { color: colors.sub, marginTop: spacing.sm, lineHeight: 20 },
  statusCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontWeight: "700", color: colors.ink, fontSize: 15 },
  grantedEmail: { color: colors.sub, marginTop: 6 },
  button: { borderRadius: radius.md, padding: 14, alignItems: "center", marginTop: spacing.xl },
  danger: { backgroundColor: colors.danger },
  buttonText: { color: "#fff", fontWeight: "700" },
  refreshLink: { alignItems: "center", marginTop: spacing.lg },
  refreshLinkText: { color: colors.violet, fontWeight: "600" },
});
