import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import Config from "../config";
import { loginWithGoogle, loginWithPassword, type AuthResponse } from "../services/auth";
import { useAuthStore } from "../store/useAuthStore";

WebBrowser.maybeCompleteAuthSession();

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

  // 웹(및 GoogleSignin 네이티브 모듈이 없는 환경)용 OAuth 플로우. Google Cloud Console에서 발급받은
  // client ID를 mobile/.env의 EXPO_PUBLIC_GOOGLE_*_CLIENT_ID에 채워야 실제로 동작한다.
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: Config.GOOGLE_WEB_CLIENT_ID,
    iosClientId: Config.GOOGLE_IOS_CLIENT_ID,
    androidClientId: Config.GOOGLE_ANDROID_CLIENT_ID,
    responseType: "id_token",
    scopes: ["openid", "profile", "email"],
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === "success") {
      const idToken = response.params.id_token;
      if (idToken) {
        void applyBackendLogin(loginWithGoogle(idToken));
      }
    } else if (response.type === "error") {
      console.error(response.error);
      Alert.alert("로그인 실패", "Google 로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  async function applyBackendLogin(promise: Promise<AuthResponse>) {
    setLoading(true);
    try {
      const { accessToken, refreshToken, user } = await promise;
      setSession(accessToken, refreshToken, user);
    } catch (err) {
      console.error(err);
      Alert.alert("로그인 실패", "로그인 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (GoogleSignin) {
      setLoading(true);
      try {
        const signInResponse = await GoogleSignin.signIn();
        if (!isSuccessResponse(signInResponse)) return; // 사용자가 취소함

        const idToken = signInResponse.data.idToken;
        if (!idToken) {
          throw new Error("Google에서 idToken을 받지 못했습니다.");
        }
        await applyBackendLogin(loginWithGoogle(idToken));
      } catch (err) {
        if (isErrorWithCode(err) && (err as { code: string }).code === statusCodes.SIGN_IN_CANCELLED) {
          return;
        }
        console.error(err);
        Alert.alert("로그인 실패", "Google 로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!Config.GOOGLE_WEB_CLIENT_ID) {
      Alert.alert(
        "Google 로그인 설정 필요",
        "mobile/.env에 EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID를 채운 뒤 dev 서버를 재시작해주세요.",
      );
      return;
    }

    await promptAsync();
  }

  async function handleTestLogin() {
    await applyBackendLogin(loginWithPassword("alice", "password123"));
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>LastWeekOnEarth</Text>
        <Text style={styles.subtitle}>구글 계정으로 로그인하세요</Text>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={loading || (!GoogleSignin && !request)}
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

        {Platform.OS === "web" && (
          <TouchableOpacity style={styles.testLoginButton} onPress={handleTestLogin} disabled={loading}>
            <Text style={styles.testLoginText}>테스트 계정으로 로그인 (alice)</Text>
          </TouchableOpacity>
        )}
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
  testLoginButton: { marginTop: 16, padding: 8 },
  testLoginText: { color: "#9CA3AF", fontSize: 13, textDecorationLine: "underline" },
});
