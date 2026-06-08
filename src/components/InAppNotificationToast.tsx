import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../services/i18n";
import { AppNotification } from "../types";

type Props = {
  notification: AppNotification | null;
  onClose: () => void;
  onOpen?: (notification: AppNotification) => void;
};

export function InAppNotificationToast({ notification, onClose, onOpen }: Props) {
  const { t, tr } = useI18n();
  if (!notification) return null;

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.card} onPress={() => onOpen?.(notification)}>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{tr(notification.title)}</Text>
          <Text numberOfLines={2} style={styles.body}>
            {tr(notification.body)}
          </Text>
        </View>
        <Pressable accessibilityLabel={t("a11y.closeNotification")} style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>X</Text>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    left: 14,
    position: "absolute",
    right: 14,
    top: 54,
    zIndex: 20
  },
  card: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 12
  },
  textWrap: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900"
  },
  body: {
    color: "#dfe9e2",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderRadius: 8,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  closeText: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  }
});
