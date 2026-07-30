import React from "react";
import { Image, Modal, Pressable, StyleSheet, View } from "react-native";
import { CloseIcon, DownloadIcon } from "./Icon";
import { spacing } from "../theme/colors";

interface ImageViewerModalProps {
  uri: string | null;
  onClose: () => void;
}

interface WebDownloadLink {
  href: string;
  download: string;
  click: () => void;
  remove: () => void;
}

export function ImageViewerModal({ uri, onClose }: ImageViewerModalProps) {
  const handleSave = () => {
    if (!uri) return;

    const webDocument = (
      globalThis as unknown as {
        document?: {
          createElement: (tag: "a") => WebDownloadLink;
          body: { appendChild: (link: WebDownloadLink) => void };
        };
      }
    ).document;
    if (!webDocument) return;

    const link = webDocument.createElement("a");
    link.href = uri;
    link.download = `anchora-photo-${Date.now()}.jpg`;
    webDocument.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.header}>
          <Pressable style={styles.actionButton} onPress={onClose}>
            <CloseIcon size={20} color="#fff" />
          </Pressable>
          <Pressable style={styles.actionButton} onPress={handleSave}>
            <DownloadIcon size={20} color="#fff" />
          </Pressable>
        </View>

        <Pressable style={styles.imageArea} onPress={(event) => event.stopPropagation()}>
          {uri ? <Image source={{ uri }} style={styles.image} resizeMode="contain" /> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
    padding: spacing.lg,
  },
  header: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 1,
    flexDirection: "row",
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
  imageArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
