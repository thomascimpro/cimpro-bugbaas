import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { NestDefenseGame } from "../minigames/NestDefenseGame";
import { useI18n } from "../../services/i18n";
import { useResponsiveLayout } from "../../theme/useResponsiveLayout";
import type { SwarmSiegePhaseId, SwarmSiegeRunTicket } from "../../services/swarmSiegeService";
import type { ArcadeRunResult, User } from "../../types";

type Props = {
  onBack: () => void;
  onResult: (result: ArcadeRunResult) => void;
  phaseId: SwarmSiegePhaseId;
  ticket: SwarmSiegeRunTicket;
  user: User;
};

export function SwarmAssaultGame({ onBack, onResult, phaseId, ticket, user }: Props) {
  const { t } = useI18n();
  const layout = useResponsiveLayout();
  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={[styles.phaseBanner, { left: layout.gutter, maxWidth: layout.gameCanvasMaxWidth, right: layout.gutter }]}>
        <Text style={styles.kicker}>{t("swarm.assault.kicker")}</Text>
        <Text style={styles.title}>{t(`swarm.phase.${phaseId}`)}</Text>
        <Text style={styles.body}>{t(`swarm.modifierBody.${ticket.modifier}`)}</Text>
      </View>
      <NestDefenseGame
        eventLabel={`${t("swarm.assault.title")} · ${t(`swarm.modifier.${ticket.modifier}`)}`}
        eventModifier={ticket.modifier}
        onBack={onBack}
        onResult={onResult}
        ranked
        recordHighScore={false}
        seed={ticket.seed}
        user={user}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#100b28", flex: 1 },
  phaseBanner: {
    alignSelf: "center",
    backgroundColor: "rgba(25,15,61,0.95)",
    borderColor: "rgba(169,150,255,0.68)",
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 460,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: "absolute",
    top: 8,
    zIndex: 20
  },
  kicker: { color: "#ff9b4a", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  title: { color: "#ffffff", fontSize: 14, fontWeight: "900", marginTop: 1 },
  body: { color: "#d6cff3", fontSize: 9, lineHeight: 13, marginTop: 2 }
});
