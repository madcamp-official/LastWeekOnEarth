import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axios from "axios";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import Config from "../config";
import { loginWithEmail, loginWithGoogle, loginWithPassword, type AuthResponse } from "../services/auth";
import { useAuthStore } from "../store/useAuthStore";
import { GoogleLogo } from "../components/GoogleLogo";

WebBrowser.maybeCompleteAuthSession();

// 서버(email.controller.ts)와 동일한 규칙 — 형식이 안 맞으면 요청 보내기 전에 바로 알려준다.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "로그인 처리 중 오류가 발생했습니다.";
      Alert.alert("로그인 실패", message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert("올바른 이메일 형식이 아닙니다.");
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      Alert.alert("비밀번호는 영문+숫자 조합 6자 이상이어야 합니다.");
      return;
    }
    // 계정이 없으면 서버가 자동으로 만들어준다 (처음 입력한 비밀번호가 그대로 계정 비밀번호가 됨).
    await applyBackendLogin(loginWithEmail(trimmedEmail, password));
  }

  // 개발/데모 편의용 — backend/prisma/seed.ts로 심어둔 테스트 계정(alice)에 바로 로그인한다.
  // 소속/전화번호까지 채워져 있어 프로필 완성 화면 없이 바로 메인 화면으로 들어간다.
  async function handleTestLogin() {
    await applyBackendLogin(loginWithPassword("alice", "password123"));
  }

  async function handleGoogleLogin() {
    if (GoogleSignin) {
      setLoading(true);
      try {
        // signIn()은 기기에 이미 로그인된 세션이 있으면 계정 선택 없이 그대로 재사용한다.
        // 매번 계정을 선택할 수 있도록(다른 Gmail 계정으로 전환 가능하게) 먼저 로그아웃해둔다.
        try {
          await GoogleSignin.signOut();
        } catch {
          // 로그인된 세션이 없을 때도 여기로 올 수 있어 무시한다.
        }

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
                <GoogleLogo size={20} />
              </View>
              <Text style={styles.googleButtonText}>Google로 계속하기</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          style={styles.input}
          placeholder="이메일"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 (영문+숫자 6자 이상)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        <Text style={styles.emailHint}>처음 로그인하는 이메일이면 자동으로 계정이 만들어져요.</Text>

        <TouchableOpacity
          style={styles.emailButton}
          onPress={handleEmailLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.emailButtonText}>이메일로 계속하기</Text>}
        </TouchableOpacity>

        {__DEV__ && (
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
    marginRight: 12,
  },
  googleButtonText: { fontSize: 16, fontWeight: "600", color: "#1F1F1F" },
  divider: { flexDirection: "row", alignItems: "center", width: "100%", marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dividerText: { marginHorizontal: 12, color: "#9CA3AF", fontSize: 12 },
  input: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderColor: "#DADCE0",
    borderRadius: 8,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  emailHint: { color: "#9CA3AF", fontSize: 12, marginBottom: 14, alignSelf: "flex-start" },
  emailButton: {
    width: "100%",
    height: 48,
    borderRadius: 8,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  emailButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  testLoginButton: { marginTop: 16, padding: 8 },
  testLoginText: { color: "#9CA3AF", fontSize: 13, textDecorationLine: "underline" },
});
