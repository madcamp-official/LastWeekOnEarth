import React, { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PostStackParamList } from "../navigation/postTypes";
import { postsApi } from "../services/postsApi";
import { BackButton } from "../components/BackButton";
import { KeyboardAvoidingScreen } from "../components/KeyboardAvoidingScreen";
import { SolidButtonView } from "../components/SolidButtonView";
import { ActionSheet } from "../components/ActionSheet";
import { colors, radius, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<PostStackParamList, "CreatePost">;

export function CreatePostScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoMenuVisible, setPhotoMenuVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("사진 접근 권한이 필요합니다.");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) {
        console.warn("[CreatePostScreen] picker result missing base64:", JSON.stringify(result));
        Alert.alert("사진을 불러오지 못했습니다.", "다른 사진으로 다시 시도해주세요.");
        return;
      }
      setPhotoUrl(`data:image/jpeg;base64,${asset.base64}`);
    } catch (err) {
      console.warn("[CreatePostScreen] photo pick failed:", err);
      Alert.alert("사진 선택 실패", err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    }
  };

  const handlePhotoPress = () => {
    if (!photoUrl) {
      handlePickPhoto();
      return;
    }
    setPhotoMenuVisible(true);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert("소식 내용을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await postsApi.create({ content: content.trim(), photoUrl: photoUrl ?? undefined });
      navigation.navigate("PostFeed", { initialTab: "MINE", refreshKey: Date.now() });
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "소식을 올리지 못했습니다.";
      Alert.alert("게시 실패", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>소식 올리기</Text>
      </View>
    <KeyboardAvoidingScreen>
    <View style={styles.container}>
      {photoUrl ? (
        <Pressable onPress={handlePhotoPress}>
          <Image source={{ uri: photoUrl }} style={styles.photoPreview} />
        </Pressable>
      ) : (
        <Pressable style={styles.photoPicker} onPress={handlePhotoPress}>
          <Text style={styles.photoPickerText}>+ 사진 추가</Text>
        </Pressable>
      )}

      <TextInput
        style={styles.contentInput}
        placeholder="무슨 소식이 있나요?"
        placeholderTextColor={colors.faint}
        value={content}
        onChangeText={setContent}
        multiline
        textAlignVertical="top"
      />

      <Pressable onPress={handleSubmit} disabled={submitting}>
        <SolidButtonView style={styles.submitButton} borderRadius={radius.md}>
          <Text style={styles.submitButtonText}>{submitting ? "게시 중..." : "소식 올리기"}</Text>
        </SolidButtonView>
      </Pressable>
    </View>
    </KeyboardAvoidingScreen>
    <ActionSheet
      visible={photoMenuVisible}
      onClose={() => setPhotoMenuVisible(false)}
      options={[
        { label: "사진 변경", onPress: handlePickPhoto },
        { label: "사진 삭제", onPress: () => setPhotoUrl(null), destructive: true },
      ]}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: colors.ink },
  container: { flex: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.bg },
  contentInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 12,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  photoPicker: {
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: "dashed",
    borderRadius: radius.md,
    padding: 20,
    alignItems: "center",
  },
  photoPickerText: { color: colors.violet, fontWeight: "600" },
  photoPreview: { width: "100%", aspectRatio: 1.4, borderRadius: radius.md },
  submitButton: { padding: 14, alignItems: "center", marginTop: 8 },
  submitButtonText: { color: "#fff", fontWeight: "700" },
});
