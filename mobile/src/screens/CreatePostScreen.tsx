import React, { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PostStackParamList } from "../navigation/postTypes";
import { postsApi } from "../services/postsApi";

type Props = NativeStackScreenProps<PostStackParamList, "CreatePost">;

export function CreatePostScreen({ navigation }: Props) {
  const [content, setContent] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("사진 접근 권한이 필요합니다.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    setPhotoUrl(`data:image/jpeg;base64,${result.assets[0].base64}`);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert("소식 내용을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await postsApi.create({ content: content.trim(), photoUrl: photoUrl ?? undefined });
      navigation.goBack();
    } catch {
      Alert.alert("게시 실패", "소식을 올리지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.contentInput}
        placeholder="무슨 소식이 있나요?"
        value={content}
        onChangeText={setContent}
        multiline
        textAlignVertical="top"
      />

      {photoUrl ? (
        <View style={styles.photoPreviewWrap}>
          <Image source={{ uri: photoUrl }} style={styles.photoPreview} />
          <Pressable style={styles.removePhotoButton} onPress={() => setPhotoUrl(null)}>
            <Text style={styles.removePhotoText}>사진 제거</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.photoPicker} onPress={handlePickPhoto}>
          <Text style={styles.photoPickerText}>+ 사진 추가</Text>
        </Pressable>
      )}

      <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.submitButtonText}>{submitting ? "게시 중..." : "소식 올리기"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  contentInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  photoPicker: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
  },
  photoPickerText: { color: "#888", fontWeight: "600" },
  photoPreviewWrap: { gap: 8 },
  photoPreview: { width: "100%", aspectRatio: 1.4, borderRadius: 8 },
  removePhotoButton: { alignSelf: "flex-start" },
  removePhotoText: { color: "#B00020", fontSize: 13, fontWeight: "600" },
  submitButton: { backgroundColor: "#111", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  submitButtonText: { color: "#fff", fontWeight: "700" },
});
