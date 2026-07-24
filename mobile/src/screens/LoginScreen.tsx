import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Config from "../config";
import { loginWithGoogle } from "../services/auth";
import { useAuthStore } from "../store/useAuthStore";

// react-native-google-signin은 네이티브 전용 모듈이라 웹 프리뷰에서는 로드하지 않는다.
const GoogleSigninModule = Platform.OS === "web" ? null : require("@react-native-google-signin/google-signin");
const GoogleSignin = GoogleSigninModule?.GoogleSignin;
const isSuccessResponse = GoogleSigninModule?.isSuccessResponse;
const isErrorWithCode = GoogleSigninModule?.isErrorWithCode;
const statusCodes = GoogleSigninModule?.statusCodes;

if (GoogleSignin) {
  GoogleSignin.configure({
    webClientId: Config.GOOGLE_WEB_CLIENT_ID,
    iosClientId: Config.GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
}

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    GoogleSignin?.hasPlayServices({ showPlayServicesUpdateDialog: true }).catch(() => undefined);
  }, []);

  async function handleGoogleLogin() {
    if (!GoogleSignin) {
      // 웹 프리뷰는 Google Sign-in 네이티브 모듈이 없어 목업 세션으로 메인 화면 UI만 확인한다.
      setSession("web-preview-token", "web-preview-refresh-token", {
        id: "web-preview",
        username: "preview",
        name: "프리뷰 사용자",
        email: "preview@example.com",
        phoneVerified: false,
      });
      return;
    }
    setLoading(true);
    try {
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return; // 사용자가 취소함

      const idToken = response.data.idToken;
      if (!idToken) {
        throw new Error("Google에서 idToken을 받지 못했습니다.");
      }

      const { accessToken, refreshToken, user } = await loginWithGoogle(idToken);
      setSession(accessToken, refreshToken, user);
    } catch (err) {
      if (isErrorWithCode(err) && (err as { code: string }).code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      console.error(err);
      Alert.alert("로그인 실패", "Google 로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>LastWeekOnEarth</Text>
        <Text style={styles.subtitle}>구글 계정으로 로그인하세요</Text>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#1F1F1F" />
          ) : (
            <>
              <View style={styles.googleIcon}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Google로 계속하기</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6B7280", marginBottom: 40 },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DADCE0",
    backgroundColor: "#FFFFFF",
  },
  googleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  googleIconText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  googleButtonText: { fontSize: 16, fontWeight: "600", color: "#1F1F1F" },
});
