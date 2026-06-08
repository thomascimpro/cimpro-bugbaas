import { NativeModules, Platform } from "react-native";

type BugBaasNativeSoundModule = {
  playSound?: (name: string) => Promise<boolean>;
};

const nativeModule = NativeModules.BugBaasNative as BugBaasNativeSoundModule | undefined;

export type BugSoundName = "bug_hit" | "bug_catch" | "bug_unlock" | "bug_rare_unlock";

export function playBugSound(name: BugSoundName) {
  if (Platform.OS !== "android") return;
  void nativeModule?.playSound?.(name).catch(() => undefined);
}
