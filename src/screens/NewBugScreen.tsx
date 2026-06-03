import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import React, { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { createBug } from "../services/bugService";
import { BugSeverity, User } from "../types";
import { sharedStyles } from "./sharedStyles";

const severities: BugSeverity[] = ["Laag", "Normaal", "Hoog", "Kritiek"];
const maxScreenshotSize = 640;
const screenshotQuality = 0.35;

type Props = {
  user: User;
  onBack: () => void;
  onSaved: () => void;
};

export function NewBugScreen({ user, onBack: _onBack, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [severity, setSeverity] = useState<BugSeverity>("Normaal");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [screenshotPreviewUri, setScreenshotPreviewUri] = useState<string | undefined>();
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled) return;

    const asset = result.assets[0];
    const largestSide = Math.max(asset.width ?? 0, asset.height ?? 0);
    const resize =
      largestSide > maxScreenshotSize
        ? [{ resize: asset.width && asset.width >= (asset.height ?? 0) ? { width: maxScreenshotSize } : { height: maxScreenshotSize } }]
        : [];
    const compressed = await ImageManipulator.manipulateAsync(asset.uri, resize, {
      compress: screenshotQuality,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true
    });
    setScreenshotPreviewUri(compressed.uri);
    setScreenshotDataUrl(compressed.base64 ? `data:image/jpeg;base64,${compressed.base64}` : undefined);
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      await createBug({ title, project, severity, description, steps, screenshotDataUrl }, user);
      onSaved();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Opslaan mislukt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={sharedStyles.screen}>
      <Text style={sharedStyles.title}>Nieuwe bug</Text>
      <Text style={sharedStyles.label}>Titel</Text>
      <TextInput style={sharedStyles.input} value={title} onChangeText={setTitle} />
      <Text style={sharedStyles.label}>Systeem/project</Text>
      <TextInput style={sharedStyles.input} value={project} onChangeText={setProject} />
      <Text style={sharedStyles.label}>Urgentie</Text>
      <View style={sharedStyles.row}>
        {severities.map((item) => (
          <Pressable key={item} style={severity === item ? sharedStyles.button : sharedStyles.secondaryButton} onPress={() => setSeverity(item)}>
            <Text style={severity === item ? sharedStyles.buttonText : sharedStyles.secondaryButtonText}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={sharedStyles.label}>Beschrijving</Text>
      <TextInput multiline style={[sharedStyles.input, { minHeight: 90 }]} value={description} onChangeText={setDescription} />
      <Text style={sharedStyles.label}>Stappen om te reproduceren</Text>
      <TextInput multiline style={[sharedStyles.input, { minHeight: 90 }]} value={steps} onChangeText={setSteps} />
      {screenshotPreviewUri && <Image source={{ uri: screenshotPreviewUri }} style={{ height: 180, borderRadius: 8, marginBottom: 10 }} />}
      <Pressable style={sharedStyles.secondaryButton} onPress={pickImage}>
        <Text style={sharedStyles.secondaryButtonText}>Screenshot kiezen</Text>
      </Pressable>
      <Pressable style={sharedStyles.button} disabled={busy} onPress={save}>
        {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={sharedStyles.buttonText}>Opslaan</Text>}
      </Pressable>
      {!!error && <Text style={sharedStyles.error}>{error}</Text>}
    </ScrollView>
  );
}
