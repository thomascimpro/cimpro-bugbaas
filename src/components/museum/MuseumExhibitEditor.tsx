import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { entryByBugId } from "../../services/bugDexService";
import { bugDexEntryName, useI18n } from "../../services/i18n";
import { museumSlotCapacity, type MuseumExhibitPlacement } from "../../services/museumPlacementModel";
import type { MuseumWingStage } from "../../screens/MuseumScreenModel";
import type { BugDexInventoryItem } from "../../types";
import { BugArtImage } from "../BugArtImage";

export function MuseumExhibitEditor({
  items,
  placements,
  stage,
  onClear,
  onPlace,
  onClose
}: {
  items: BugDexInventoryItem[];
  placements: MuseumExhibitPlacement[];
  stage: MuseumWingStage;
  onClear: (slotId: string) => void;
  onPlace: (slotId: string, bugId: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const capacity = museumSlotCapacity(stage);
  const [slotId, setSlotId] = useState("slot-1");
  const placementBySlot = new Map(placements.map((placement) => [placement.slotId, placement]));
  const used = new Set(placements.map((placement) => placement.bugId));
  const selectedSlotNumber = Number(slotId.replace("slot-", ""));

  useEffect(() => {
    if (selectedSlotNumber > capacity) setSlotId("slot-1");
  }, [capacity, selectedSlotNumber]);

  function bugName(bugId: string) {
    const entry = entryByBugId(bugId);
    return entry ? bugDexEntryName(entry, t) : bugId;
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>{t("museum.exhibitEditor.kicker")}</Text>
          <Text style={styles.title}>{t("museum.exhibitEditor.title")}</Text>
        </View>
        <Pressable accessibilityLabel={t("common.close")} accessibilityRole="button" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>
      {capacity <= 0 ? (
        <Text style={styles.locked}>{t("museum.exhibitEditor.locked")}</Text>
      ) : (
        <>
          <View style={styles.slots}>
            {Array.from({ length: 6 }).map((_, index) => {
              const currentSlot = `slot-${index + 1}`;
              const placement = placementBySlot.get(currentSlot);
              const locked = index >= capacity;
              const requiredStage = requiredStageForSlot(index + 1);
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: locked, selected: slotId === currentSlot }}
                  disabled={locked}
                  key={currentSlot}
                  onPress={() => setSlotId(currentSlot)}
                  style={({ pressed }) => [styles.slot, locked && styles.slotLocked, slotId === currentSlot && styles.slotActive, pressed && !locked && styles.pressed]}
                >
                  {locked ? <Text style={styles.lockIcon}>🔒</Text> : placement ? <BugArtImage bugId={placement.bugId as never} size={46} /> : <Text style={styles.plus}>+</Text>}
                  <Text numberOfLines={1} style={styles.slotName}>
                    {locked ? `${t(`museum.stage.${requiredStage}`)} · ${index + 1}` : placement ? bugName(placement.bugId) : t("museum.exhibitEditor.slot", { number: index + 1 })}
                  </Text>
                  {!locked && placement ? (
                    <Pressable accessibilityRole="button" onPress={() => onClear(currentSlot)}>
                      <Text style={styles.remove}>{t("museum.exhibitEditor.remove")}</Text>
                    </Pressable>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.choiceLabel}>{t("museum.exhibitEditor.available", { number: selectedSlotNumber })}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>
            {items.map((item) => {
              const disabled = used.has(item.bugId) && placementBySlot.get(slotId)?.bugId !== item.bugId;
              return (
                <Pressable accessibilityRole="button" disabled={disabled} key={item.bugId} onPress={() => onPlace(slotId, item.bugId)} style={({ pressed }) => [styles.choice, disabled && styles.choiceDisabled, pressed && !disabled && styles.pressed]}>
                  <BugArtImage bugId={item.bugId as never} size={54} />
                  <Text numberOfLines={1} style={styles.choiceName}>{bugName(item.bugId)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: "rgba(24,21,53,0.98)", borderColor: "rgba(241,215,125,0.45)", borderRadius: 18, borderWidth: 1, marginTop: 0, padding: 12, position: "relative", width: "100%", zIndex: 5 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  kicker: { color: "#f1d77d", fontSize: 7, fontWeight: "900", letterSpacing: 1 },
  title: { color: "#fff8df", fontSize: 15, fontWeight: "900", marginTop: 2 },
  close: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 15, height: 30, justifyContent: "center", width: 30 },
  closeText: { color: "#ffffff", fontSize: 20, fontWeight: "900" },
  locked: { color: "#cbc7dc", fontSize: 10, lineHeight: 16, marginTop: 12 },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  slot: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)", borderRadius: 12, borderWidth: 1, minHeight: 86, padding: 6, width: "31%" },
  slotActive: { borderColor: "#f1d77d", backgroundColor: "rgba(241,215,125,0.12)" },
  slotLocked: { backgroundColor: "rgba(0,0,0,0.22)", borderColor: "rgba(255,255,255,0.08)", opacity: 0.55 },
  lockIcon: { color: "#cbc7dc", fontSize: 24, height: 46, textAlignVertical: "center" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  plus: { color: "#f1d77d", fontSize: 28, fontWeight: "900", height: 46 },
  slotName: { color: "#ffffff", fontSize: 7.5, fontWeight: "900", marginTop: 3, textAlign: "center" },
  remove: { color: "#ffb0a6", fontSize: 7, fontWeight: "800", marginTop: 4 },
  choiceLabel: { color: "#cbc7dc", fontSize: 8, fontWeight: "900", marginTop: 12, textTransform: "uppercase" },
  choices: { gap: 7, paddingTop: 8 },
  choice: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, minHeight: 82, padding: 7, width: 82 },
  choiceDisabled: { opacity: 0.28 },
  choiceName: { color: "#ffffff", fontSize: 7.5, fontWeight: "900", marginTop: 4, textAlign: "center" }
});

function requiredStageForSlot(slotNumber: number): MuseumWingStage {
  if (slotNumber <= 1) return "discovered";
  if (slotNumber <= 3) return "open";
  return "curated";
}
