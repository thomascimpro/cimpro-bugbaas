import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NotificationSettings, NotificationType } from "../types";
import { sharedStyles } from "./sharedStyles";

const options: { type: NotificationType; title: string; body: string }[] = [
  { type: "trade", title: "Ruilverzoeken", body: "Als iemand met je BugDex wil ruilen." },
  { type: "new_bug", title: "Nieuwe bugs", body: "Als een collega een bug meldt." },
  { type: "comment", title: "Reacties", body: "Als iemand reageert op jouw bug." },
  { type: "bug_update", title: "Bug updates", body: "Als status of voortgang verandert." },
  { type: "bugdex", title: "BugDex rewards", body: "Als je een nieuwe BugDex vondst krijgt." }
];

type Props = {
  settings: NotificationSettings;
  onBack: () => void;
  onChange: (settings: NotificationSettings) => void;
  onShowHelp: () => void;
};

export function SettingsScreen({ settings, onBack, onChange, onShowHelp }: Props) {
  function toggle(type: NotificationType) {
    onChange({ ...settings, [type]: !settings[type] });
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={sharedStyles.screen}>
      <Text style={sharedStyles.title}>Instellingen</Text>
      <Text style={sharedStyles.subtitle}>Meldingen</Text>
      <View style={styles.list}>
        {options.map((option) => {
          const enabled = settings[option.type];
          return (
            <Pressable key={option.type} style={styles.row} onPress={() => toggle(option.type)}>
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>{option.title}</Text>
                <Text style={styles.rowBody}>{option.body}</Text>
              </View>
              <View style={[styles.toggle, enabled && styles.toggleOn]}>
                <View style={[styles.knob, enabled && styles.knobOn]} />
              </View>
            </Pressable>
          );
        })}
      </View>
      <Pressable style={styles.helpButton} onPress={onShowHelp}>
        <Text style={styles.helpButtonText}>Help bekijken</Text>
      </Pressable>
      <Pressable style={sharedStyles.secondaryButton} onPress={onBack}>
        <Text style={sharedStyles.secondaryButtonText}>Terug</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 160
  },
  list: {
    gap: 10,
    marginBottom: 14
  },
  helpButton: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderRadius: 8,
    justifyContent: "center",
    marginBottom: 10,
    minHeight: 50
  },
  helpButtonText: {
    color: "#ffffff",
    fontWeight: "900"
  },
  row: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  rowTitle: {
    color: "#102018",
    fontSize: 15,
    fontWeight: "900"
  },
  rowBody: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  toggle: {
    backgroundColor: "#c6d3cc",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    paddingHorizontal: 3,
    width: 54
  },
  toggleOn: {
    backgroundColor: "#15724f"
  },
  knob: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    height: 24,
    width: 24
  },
  knobOn: {
    alignSelf: "flex-end"
  }
});
