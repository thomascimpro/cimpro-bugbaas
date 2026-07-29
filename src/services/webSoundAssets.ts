import type { BugSoundName } from "./webSoundProfile";

type WebSoundAsset = string | number | { uri?: string };

const assets: Record<BugSoundName, WebSoundAsset> = {
  arcade_build: require("../../assets/audio/arcade_build.wav"),
  arcade_finish: require("../../assets/audio/arcade_finish.wav"),
  arcade_hit: require("../../assets/audio/arcade_hit.wav"),
  arcade_pickup: require("../../assets/audio/arcade_pickup.wav"),
  arcade_start: require("../../assets/audio/arcade_start.wav"),
  arcade_tap: require("../../assets/audio/arcade_tap.wav"),
  bug_hit: require("../../assets/audio/bug_hit.wav"),
  bug_catch: require("../../assets/audio/bug_catch.wav"),
  bug_unlock: require("../../assets/audio/bug_unlock.wav"),
  bug_rare_unlock: require("../../assets/audio/bug_rare_unlock.wav"),
  spray_hit: require("../../assets/audio/spray_hit.wav"),
  spray_start: require("../../assets/audio/spray_start.wav")
};

export function webSoundAsset(name: BugSoundName): WebSoundAsset {
  return assets[name];
}
