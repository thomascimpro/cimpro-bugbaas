import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import type { AppOverlay } from "../navigation/appNavigation";

type Props = {
  overlay: AppOverlay | null;
  onClose: () => void;
  renderOverlay?: (overlay: AppOverlay) => React.ReactNode;
};

export function AppOverlayHost({ overlay, onClose, renderOverlay }: Props) {
  if (!overlay || !renderOverlay) return null;
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.content}>{renderOverlay(overlay)}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(2, 11, 8, 0.72)",
    flex: 1,
    justifyContent: "flex-end"
  },
  content: {
    maxHeight: "92%",
    minHeight: 0
  }
});
