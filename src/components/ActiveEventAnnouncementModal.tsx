import React from "react";
import { ImageBackground, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../services/i18n";

export type ActiveEventAnnouncement = {
  eventId: string;
  kind: "releaseBoss" | "swarmSiege" | "teamHunt";
};

type Props = {
  announcement: ActiveEventAnnouncement | null;
  onClose: () => void;
  onOpen: () => void;
};

const eventArt = {
  releaseBoss: require("../../assets/generated/release-boss-v1.jpg"),
  swarmSiege: require("../../assets/generated/solo-boss-hornet-hd.webp"),
  teamHunt: require("../../assets/generated/biome-atlas-v1.jpg")
};

export function ActiveEventAnnouncementModal({ announcement, onClose, onOpen }: Props) {
  const { language } = useI18n();
  if (!announcement) return null;
  const copy = eventCopy[language][announcement.kind];

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ImageBackground imageStyle={styles.artImage} source={eventArt[announcement.kind]} style={styles.art}>
            <View style={styles.shade} />
            <Text style={styles.kicker}>{copy.kicker}</Text>
            <Text style={styles.title}>{copy.title}</Text>
          </ImageBackground>
          <View style={styles.copy}>
            <Text style={styles.body}>{copy.body}</Text>
            <Text style={styles.hint}>{copy.hint}</Text>
            <Pressable accessibilityRole="button" onPress={onOpen} style={styles.primaryButton}>
              <Text style={styles.primaryText}>{copy.open}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>{copy.later}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const eventCopy = {
  nl: {
    releaseBoss: { body: "Werk samen met alle spelers en versla de seizoensbaas.", hint: "Doe mee om de finale-beloning te verdienen.", kicker: "EVENT GESTART!", later: "LATER", open: "BEKIJK EVENT", title: "Release Boss" },
    swarmSiege: { body: "De zwerm valt aan. Speel maximaal 3 aanvallen en help de gezamenlijke balk vullen.", hint: "Doe schade voor XP en kans op de eventbug.", kicker: "EVENT GESTART!", later: "LATER", open: "SPEEL EVENT", title: "Swarm Siege" },
    teamHunt: { body: "Zoek echte bugs en help jouw team nieuwe soorten vinden.", hint: "Elke goede veldnotitie helpt jouw team.", kicker: "EVENT GESTART!", later: "LATER", open: "BEKIJK EVENT", title: "Team Hunt" }
  },
  en: {
    releaseBoss: { body: "Team up with every player and defeat the season boss.", hint: "Join in to earn the finale reward.", kicker: "EVENT STARTED!", later: "LATER", open: "VIEW EVENT", title: "Release Boss" },
    swarmSiege: { body: "The swarm is attacking. Play up to 3 attacks and fill the shared bar.", hint: "Deal damage for XP and a chance at the event bug.", kicker: "EVENT STARTED!", later: "LATER", open: "PLAY EVENT", title: "Swarm Siege" },
    teamHunt: { body: "Find real bugs and help your team discover new species.", hint: "Every verified field note helps your team.", kicker: "EVENT STARTED!", later: "LATER", open: "VIEW EVENT", title: "Team Hunt" }
  },
  fr: {
    releaseBoss: { body: "Joue avec tous les joueurs et bats le boss de saison.", hint: "Participe pour gagner la récompense finale.", kicker: "ÉVÉNEMENT ACTIF !", later: "PLUS TARD", open: "VOIR L'ÉVÉNEMENT", title: "Release Boss" },
    swarmSiege: { body: "L'essaim attaque. Joue jusqu'à 3 attaques et remplis la barre commune.", hint: "Inflige des dégâts pour gagner de l'XP et tenter d'obtenir l'insecte événement.", kicker: "ÉVÉNEMENT ACTIF !", later: "PLUS TARD", open: "JOUER", title: "Swarm Siege" },
    teamHunt: { body: "Trouve de vrais insectes et aide ton équipe à découvrir de nouvelles espèces.", hint: "Chaque note de terrain vérifiée aide ton équipe.", kicker: "ÉVÉNEMENT ACTIF !", later: "PLUS TARD", open: "VOIR L'ÉVÉNEMENT", title: "Team Hunt" }
  }
} as const;

const styles = StyleSheet.create({
  art: { height: 190, justifyContent: "flex-end", padding: 20 },
  artImage: { resizeMode: "cover" },
  backdrop: { alignItems: "center", backgroundColor: "rgba(4,12,10,0.82)", flex: 1, justifyContent: "center", padding: 22 },
  body: { color: "#17372c", fontSize: 16, fontWeight: "900", lineHeight: 22, textAlign: "center" },
  card: { backgroundColor: "#f7f3e8", borderColor: "#f2c565", borderRadius: 26, borderWidth: 2, elevation: 16, maxWidth: 430, overflow: "hidden", width: "100%" },
  copy: { padding: 20 },
  hint: { color: "#617067", fontSize: 13, fontWeight: "800", lineHeight: 18, marginTop: 9, textAlign: "center" },
  kicker: { color: "#f7d27d", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  primaryButton: { alignItems: "center", backgroundColor: "#1b7f5a", borderRadius: 15, marginTop: 18, paddingVertical: 14 },
  primaryText: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  secondaryButton: { alignItems: "center", marginTop: 8, paddingVertical: 11 },
  secondaryText: { color: "#52635a", fontSize: 12, fontWeight: "900" },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8,15,22,0.52)" },
  title: { color: "#ffffff", fontSize: 30, fontWeight: "900", marginTop: 3 }
});
