import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { nativeDriver } from "../services/animationPlatform";
import { useI18n } from "../services/i18n";
import { User } from "../types";

type Props = {
  user: User | null;
  visible: boolean;
  onSave: (displayName: string) => Promise<void>;
  onCancel?: () => void;
};

export function DisplayNameModal({ user, visible, onSave, onCancel }: Props) {
  const { t, tr } = useI18n();
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setDisplayName(user?.displayName ?? "");
    setError("");
  }, [user?.displayName, visible]);

  useEffect(() => {
    if (!visible) return;
    entrance.setValue(0);
    const animation = Animated.spring(entrance, {
      friction: 7,
      tension: 82,
      toValue: 1,
      useNativeDriver: nativeDriver
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, visible]);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await onSave(displayName);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("modal.nameSaveFailed"));
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setDisplayName("");
    setError("");
    onCancel?.();
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel ? cancel : (() => undefined)}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, {
          opacity: entrance,
          transform: [{ scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }]
        }]}>
          <View style={styles.identityBadge}>
            <Image accessibilityIgnoresInvertColors source={require("../../assets/generated/bugbaas-field-emblem-v3.png")} style={styles.identityImage} />
          </View>
          <Text style={styles.title}>{t("modal.nameTitle")}</Text>
          <Text style={styles.subtitle}>{t("modal.nameSubtitle")}</Text>
          <TextInput
            autoCapitalize="words"
            maxLength={32}
            placeholder={user?.displayName || t("modal.namePlaceholder")}
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
          />
          <Pressable style={styles.button} disabled={busy} onPress={submit}>
            {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>{t("common.save")}</Text>}
          </Pressable>
          {onCancel && (
            <Pressable style={styles.cancelButton} disabled={busy} onPress={cancel}>
              <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
            </Pressable>
          )}
          {!!error && <Text style={styles.error}>{tr(error)}</Text>}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(8,12,28,0.76)",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  card: {
    backgroundColor: "#fff9e9",
    borderColor: "#e4c06b",
    borderRadius: 26,
    borderWidth: 1,
    elevation: 16,
    maxWidth: 460,
    padding: 22,
    shadowColor: "#050817",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    width: "100%"
  },
  identityBadge: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#161a35",
    borderColor: "#e4c06b",
    borderRadius: 38,
    borderWidth: 2,
    height: 76,
    justifyContent: "center",
    marginBottom: 12,
    marginTop: -5,
    width: 76
  },
  identityImage: {
    height: 62,
    width: 62
  },
  title: {
    color: "#17182b",
    fontSize: 24,
    fontWeight: "900"
  },
  subtitle: {
    color: "#706658",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 14,
    marginTop: 4
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cfd8d3",
    borderRadius: 14,
    borderWidth: 1,
    color: "#17211c",
    fontSize: 16,
    marginBottom: 12,
    padding: 14
  },
  button: {
    alignItems: "center",
    backgroundColor: "#6b3fc6",
    borderRadius: 15,
    minHeight: 52,
    justifyContent: "center"
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "900"
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: "#f2ead8",
    borderColor: "#d6c7a6",
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 48
  },
  cancelButtonText: {
    color: "#2b2940",
    fontWeight: "900"
  },
  error: {
    color: "#b83227",
    fontWeight: "800",
    marginTop: 10
  }
});
