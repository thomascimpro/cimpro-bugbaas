import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import type { User } from "../types";
import { languages, useI18n } from "../services/i18n";
import { gameTheme } from "../theme/gameTheme";
import { screenPalette } from "../theme/screenTheme";
import { useReducedMotion } from "../theme/useReducedMotion";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";
import { CharacterAvatarImage } from "./CharacterAvatarImage";
import { compactHudModel } from "./AppHudModel";
import { LanguageFlag } from "./LanguageFlag";

type Props = {
  user: User;
  notificationCount?: number;
  onOpenPlayer: () => void;
};

const hudPalette = screenPalette("neutral");
const worldPalette = screenPalette("world");

export function AppHud({ user, notificationCount = 0, onOpenPlayer }: Props) {
  const { language, setLanguage, t } = useI18n();
  const [languageOpen, setLanguageOpen] = useState(false);
  const layout = useResponsiveLayout();
  const reduceMotion = useReducedMotion();
  const model = compactHudModel(user);
  const progress = useRef(new Animated.Value(model.progress)).current;
  const badgeCount = Math.max(0, Math.floor(notificationCount));
  const avatarSize = layout.isTablet ? 44 : layout.isCompact ? 34 : 36;
  const flagSize = layout.isTablet ? 28 : 24;
  const languageControlSize = layout.isTablet ? 44 : 36;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      duration: reduceMotion ? 0 : 520,
      toValue: model.progress,
      useNativeDriver: false
    });
    animation.start();
    return () => animation.stop();
  }, [model.progress, progress, reduceMotion]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"]
  });

  return (
    <View style={[styles.wrap, { gap: layout.isTablet ? 14 : 10, minHeight: layout.isTablet ? 64 : 54, paddingHorizontal: layout.isTablet ? 14 : 9, paddingVertical: layout.isTablet ? 8 : 6 }]} testID="app-hud">
      <Pressable accessibilityLabel={t("hud.openPlayer")} accessibilityRole="button" hitSlop={8} onPress={onOpenPlayer} style={[styles.playerButton, { minHeight: layout.touchTarget }]}>
        <View style={styles.avatarWrap}>
          <CharacterAvatarImage characterId={user.characterId} size={avatarSize} />
          {badgeCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{badgeCount > 9 ? "9+" : badgeCount}</Text></View> : null}
        </View>
        <View style={[styles.playerCopy, { maxWidth: layout.isTablet ? 180 : 94 }]}>
          <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.name, { fontSize: layout.isTablet ? 14 : 12 }]}>{model.displayName}</Text>
          <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.rank, { fontSize: layout.isTablet ? 10 : 8.5 }]}>{t(model.tier.title)}</Text>
        </View>
      </Pressable>

      <View accessibilityLabel={t("hud.progress", { points: model.points })} style={[styles.progressWrap, { gap: layout.isTablet ? 5 : 4, minWidth: layout.isTablet ? 100 : 58 }]}>
        <View style={[styles.progressTrack, { height: layout.isTablet ? 8 : 6 }]}><Animated.View style={[styles.progressFill, { width: progressWidth }]} /></View>
        <Text numberOfLines={1} style={[styles.points, { fontSize: layout.isTablet ? 10 : 8.5 }]}>{model.points} XP</Text>
      </View>

      <View>
        <Pressable accessibilityLabel={t("language.label")} accessibilityRole="button" hitSlop={8} onPress={() => setLanguageOpen((current) => !current)} style={[styles.languageButton, { height: languageControlSize, width: languageControlSize }]}>
          <LanguageFlag language={language} size={flagSize} />
        </Pressable>
        {languageOpen ? (
          <View style={[styles.languageMenu, { top: languageControlSize + 6 }]}>
            {languages.map((item) => (
              <Pressable accessibilityLabel={`${t("language.label")} ${item.label}`} key={item.value} onPress={() => { setLanguage(item.value); setLanguageOpen(false); }} style={[styles.languageOption, { height: languageControlSize, width: languageControlSize }, item.value === language && styles.languageOptionActive]}>
                <LanguageFlag language={item.value} size={flagSize} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    backgroundColor: hudPalette.surface,
    borderColor: hudPalette.border,
    borderRadius: gameTheme.radius.lg,
    borderWidth: 1,
    elevation: 8,
    flexDirection: "row",
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 9,
    paddingVertical: 6,
    shadowColor: gameTheme.shadow.color,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 12
  },
  playerButton: { alignItems: "center", flexDirection: "row", gap: 7, minWidth: 0 },
  avatarWrap: { position: "relative" },
  playerCopy: { maxWidth: 94, minWidth: 0 },
  name: { color: hudPalette.ink, fontSize: 12, fontWeight: "900" },
  rank: { color: hudPalette.muted, fontSize: 8.5, fontWeight: "800", marginTop: 1 },
  progressWrap: { flex: 1, gap: 4, minWidth: 58 },
  progressTrack: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, height: 6, overflow: "hidden" },
  progressFill: { backgroundColor: worldPalette.accent, borderRadius: 999, height: "100%" },
  points: { color: worldPalette.accent, fontSize: 8.5, fontWeight: "900", textAlign: "right" },
  languageButton: { alignItems: "center", backgroundColor: hudPalette.surfaceRaised, borderRadius: 12, height: 34, justifyContent: "center", width: 34 },
  languageMenu: { backgroundColor: hudPalette.surfaceRaised, borderColor: hudPalette.border, borderRadius: 12, borderWidth: 1, gap: 4, padding: 5, position: "absolute", right: 0, top: 40, zIndex: 200 },
  languageOption: { alignItems: "center", borderRadius: 9, height: 32, justifyContent: "center", width: 32 },
  languageOptionActive: { backgroundColor: "rgba(231,204,114,0.18)" },
  badge: { alignItems: "center", backgroundColor: gameTheme.colors.danger, borderColor: gameTheme.colors.backgroundSoft, borderRadius: 9, borderWidth: 2, height: 18, justifyContent: "center", minWidth: 18, paddingHorizontal: 4, position: "absolute", right: -5, top: -5 },
  badgeText: { color: "#ffffff", fontSize: 9, fontWeight: "900" }
});
