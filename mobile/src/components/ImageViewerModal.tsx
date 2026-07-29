import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import ImageView from "react-native-image-viewing";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CloseIcon, DownloadIcon } from "./Icon";
import { notify } from "../utils/confirm";
import { spacing } from "../theme/colors";

interface ImageViewerModalProps {
  uri: string | null;
  onClose: () => void;
}

// 채팅 사진은 data:image/...;base64,... URI로 온다. MediaLibrary.saveToLibraryAsync는
// 실제 파일 경로(file://)만 받고 base64 데이터 URI는 그대로 저장하지 못해 항상 실패했다 —
// 캐시 디렉터리에 실제 파일로 먼저 써준 다음 그 경로를 저장 API에 넘긴다.
async function toLocalFileUri(uri: string): Promise<string> {
  const match = /^data:(image\/\w+);base64,(.*)$/s.exec(uri);
  if (!match) return uri;
  const [, mime, base64] = match;
  const ext = mime.split("/")[1] || "jpg";
  const fileUri = `${FileSystem.cacheDirectory}chat-photo-${Date.now()}.${ext}`;
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return fileUri;
}

// 채팅에서 주고받은 사진을 핀치로 확대/축소해서 보고, 기기 앨범에 저장할 수 있게 하는 전체화면
// 뷰어. react-native-image-viewing이 확대/축소, 스와이프로 닫기, 배경 탭으로 닫기를 이미
// 처리해줘서 직접 구현하지 않는다(순수 JS 라이브러리라 네이티브 재빌드도 필요 없음).
export function ImageViewerModal({ uri, onClose }: ImageViewerModalProps) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!uri || saving) return;
    setSaving(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        notify("사진 저장 권한이 필요합니다.");
        return;
      }
      const localUri = await toLocalFileUri(uri);
      await MediaLibrary.saveToLibraryAsync(localUri);
      notify("사진이 저장되었습니다.");
    } catch (err) {
      console.warn("[ImageViewerModal] save failed:", err);
      notify("사진 저장 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ImageView
      images={uri ? [{ uri }] : []}
      imageIndex={0}
      visible={!!uri}
      onRequestClose={onClose}
      doubleTapToZoomEnabled
      swipeToCloseEnabled
      HeaderComponent={() => (
        <View style={[styles.header, { top: insets.top + spacing.sm }]}>
          <Pressable style={styles.actionButton} onPress={onClose} hitSlop={8}>
            <CloseIcon size={20} color="#fff" />
          </Pressable>
          <Pressable style={styles.actionButton} onPress={handleSave} disabled={saving} hitSlop={8}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <DownloadIcon size={20} color="#fff" />}
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    right: spacing.lg,
    left: spacing.lg,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
