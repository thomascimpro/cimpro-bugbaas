import React, { useEffect, useRef } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { nativeDriver } from "../services/animationPlatform";
import { useI18n } from "../services/i18n";
import { AppNotification } from "../types";

type Props = {
  notification: AppNotification | null;
  onClose: () => void;
  onOpen?: (notification: AppNotification) => void;
};

export function InAppNotificationToast({ notification, onClose, onOpen }: Props) {
  const { t, tr } = useI18n();
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!notification) return;
    entrance.setValue(0);
    const animation = Animated.spring(entrance, {
      friction: 7,
      tension: 88,
      toValue: 1,
      useNativeDriver: nativeDriver
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, notification]);

  if (!notification) return null;

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.animatedCard, {
        opacity: entrance,
        transform: [
          { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }) },
          { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }
        ]
      }]}>
      <Pressable accessibilityRole="button" style={styles.card} onPress={() => onOpen?.(notification)}>
        <View style={styles.iconPlate}>
          <Image accessibilityIgnoresInvertColors source={require("../../assets/generated/bugbaas-field-emblem-v3.png")} style={styles.icon} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{tr(notification.title)}</Text>
          <Text numberOfLines={2} style={styles.body}>
            {tr(notification.body)}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={t("a11y.closeNotification")}
          style={styles.closeButton}
          onPress={(event) => {
            event.stopPropagation();
            onClose();
          }}
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    left: 14,
    position: "absolute",
    right: 14,
    top: 54,
    zIndex: 20
  },
  animatedCard: {
    maxWidth: 560,
    width: "100%"
  },
  card: {
    alignItems: "center",
    backgroundColor: "#171a35",
    borderColor: "#d8ad55",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    shadowColor: "#000000",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 16
  },
  iconPlate: {
    alignItems: "center",
    backgroundColor: "#fff3d3",
    borderRadius: 13,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  icon: {
    height: 36,
    width: 36
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
    color: "#d9d9ed",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 11,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  closeText: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900"
  }
});
