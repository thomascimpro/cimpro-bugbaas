import React from "react";
import {
  ActivityIndicator,
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { gameTheme } from "../../theme/gameTheme";
import { screenPalette, type ScreenTone } from "../../theme/screenTheme";

type Variant = "primary" | "secondary" | "reward" | "danger" | "ghost";

type Props = {
  accessibilityLabel?: string;
  compact?: boolean;
  disabled?: boolean;
  icon?: ImageSourcePropType;
  label: string;
  loading?: boolean;
  onPress: () => void;
  tone?: ScreenTone;
  variant?: Variant;
};

export function GameButton({
  accessibilityLabel,
  compact = false,
  disabled = false,
  icon,
  label,
  loading = false,
  onPress,
  tone = "neutral",
  variant = "primary"
}: Props) {
  const palette = screenPalette(tone);
  const blocked = disabled || loading;
  const backgroundColor = variant === "danger"
    ? gameTheme.colors.danger
    : variant === "reward"
      ? gameTheme.colors.accentStrong
      : variant === "primary"
        ? palette.accent
        : variant === "secondary"
          ? palette.surfaceRaised
          : "transparent";
  const borderColor = variant === "ghost" ? "rgba(255,255,255,0.24)" : palette.border;
  const textColor = variant === "danger"
    ? "#ffffff"
    : variant === "ghost"
      ? "#ffffff"
      : palette.ink;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: blocked }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        { backgroundColor, borderColor },
        blocked && styles.disabled,
        pressed && styles.pressed
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : (
        <View style={styles.content}>
          {icon ? <Image resizeMode="contain" source={icon} style={[styles.icon, compact && styles.iconCompact]} /> : null}
          <Text numberOfLines={1} style={[styles.label, compact && styles.labelCompact, { color: textColor }]}>{label}</Text>
          {variant === "primary" || variant === "reward" ? <Text style={[styles.arrow, { color: textColor }]}>→</Text> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  arrow: {
    fontSize: 20,
    fontWeight: "900"
  },
  button: {
    alignItems: "center",
    borderRadius: gameTheme.radius.md,
    borderWidth: 1,
    elevation: 4,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: gameTheme.shadow.color,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 9
  },
  compact: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    width: "100%"
  },
  disabled: {
    opacity: 0.5
  },
  icon: {
    height: 30,
    width: 30
  },
  iconCompact: {
    height: 24,
    width: 24
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
    textAlign: "center"
  },
  labelCompact: {
    fontSize: 12
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }, { translateY: 1 }]
  }
});
