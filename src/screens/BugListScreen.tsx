import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { BugCard } from "../components/BugCard";
import { listBugs } from "../services/bugService";
import { BugReport, BugStatus } from "../types";
import { sharedStyles } from "./sharedStyles";

const statuses: BugStatus[] = ["Nieuw", "Bevestigd", "In behandeling", "Gefixt", "Afgekeurd", "Dubbel"];

type Props = {
  onBack: () => void;
  onNew: () => void;
  onSelect: (bug: BugReport) => void;
};

export function BugListScreen({ onBack, onNew, onSelect }: Props) {
  const [filter, setFilter] = useState<BugStatus | undefined>();
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listBugs(filter).then(setBugs).finally(() => setLoading(false));
  }, [filter]);

  return (
    <View style={sharedStyles.screen}>
      <Text style={sharedStyles.title}>Bugs</Text>
      <Text style={sharedStyles.subtitle}>Filter op status en tik door voor details.</Text>
      <View style={sharedStyles.row}>
        <Pressable style={filter ? sharedStyles.secondaryButton : sharedStyles.button} onPress={() => setFilter(undefined)}>
          <Text style={filter ? sharedStyles.secondaryButtonText : sharedStyles.buttonText}>Alles</Text>
        </Pressable>
        {statuses.map((status) => (
          <Pressable key={status} style={filter === status ? sharedStyles.button : sharedStyles.secondaryButton} onPress={() => setFilter(status)}>
            <Text style={filter === status ? sharedStyles.buttonText : sharedStyles.secondaryButtonText}>{status}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? <ActivityIndicator /> : (
        <FlatList
          data={bugs}
          keyExtractor={(bug) => bug.id}
          ListEmptyComponent={<Text style={sharedStyles.subtitle}>Nog geen bugs. Verdacht rustig.</Text>}
          renderItem={({ item }) => <BugCard bug={item} onPress={() => onSelect(item)} />}
          style={{ marginTop: 14 }}
        />
      )}
      <Pressable style={sharedStyles.button} onPress={onNew}>
        <Text style={sharedStyles.buttonText}>Nieuwe bug</Text>
      </Pressable>
      <Pressable style={sharedStyles.secondaryButton} onPress={onBack}>
        <Text style={sharedStyles.secondaryButtonText}>Terug</Text>
      </Pressable>
    </View>
  );
}
