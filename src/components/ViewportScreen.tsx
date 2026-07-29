import React from "react";
import { StyleSheet, View } from "react-native";
import { gameTheme } from "../theme/gameTheme";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";

type Props = {
  fullWidth?: boolean;
  immersive?: boolean;
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  testID?: string;
};

export function ViewportScreen({ fullWidth = false, immersive = false, header, children, footer, testID }: Props) {
  const layout = useResponsiveLayout();
  const railInset = !immersive && layout.navigationMode === "rail" ? layout.navigationRailWidth + 32 : 0;

  return (
    <View style={[styles.screen, railInset > 0 && { paddingLeft: railInset }]} testID={testID}>
      {header ? <View style={[styles.header, { maxWidth: layout.contentMaxWidth, paddingHorizontal: layout.gutter, paddingTop: layout.headerTop }]}>{header}</View> : null}
      <View style={[styles.body, { maxWidth: fullWidth ? undefined : layout.contentMaxWidth }]}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "transparent",
    flex: 1,
    minHeight: 0
  },
  header: {
    alignSelf: "center",
    flexShrink: 0,
    paddingHorizontal: gameTheme.spacing.md,
    paddingTop: gameTheme.spacing.sm,
    width: "100%",
    zIndex: 30
  },
  body: {
    alignSelf: "center",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    width: "100%"
  },
  footer: {
    flexShrink: 0
  }
});
