import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { webSoundPlaybackMode, webSoundProfile, webUiSoundTargetSelector, webUiTapProfile } from "./webSoundProfile.ts";

const names = [
  "arcade_build",
  "arcade_finish",
  "arcade_hit",
  "arcade_pickup",
  "arcade_start",
  "arcade_tap",
  "bug_hit",
  "bug_catch",
  "bug_unlock",
  "bug_rare_unlock",
  "spray_hit",
  "spray_start"
] as const;

const serviceDir = dirname(fileURLToPath(import.meta.url));
const soundServiceSource = readFileSync(join(serviceDir, "soundService.ts"), "utf8");

test("every existing BugBaas sound has a short safe web audio profile", () => {
  names.forEach((name) => {
    const profile = webSoundProfile(name);
    assert.ok(profile.frequency >= 80 && profile.frequency <= 1800);
    assert.ok(profile.durationMs >= 20 && profile.durationMs <= 500);
    assert.ok(profile.gain > 0 && profile.gain <= 0.12);
    if (profile.accent) {
      assert.ok(profile.accent.delayMs >= 0 && profile.accent.delayMs <= 200);
      assert.ok(profile.accent.durationMs >= 20 && profile.accent.durationMs <= 300);
      assert.ok(profile.accent.frequency >= 80 && profile.accent.frequency <= 1800);
      assert.ok(profile.accent.gain > 0 && profile.accent.gain <= 0.08);
    }
  });
});

test("generic interface taps stay quieter and shorter than reward sounds", () => {
  const reward = webSoundProfile("bug_rare_unlock");
  assert.ok(webUiTapProfile.durationMs < reward.durationMs);
  assert.ok(webUiTapProfile.gain < reward.gain);
});

test("the global web sound listener includes React Native Web Pressables", () => {
  assert.match(webUiSoundTargetSelector, /tabindex/);
  assert.match(webUiSoundTargetSelector, /role=\"button\"/);
});

test("web sound assets are byte-identical to the Android APK assets", () => {
  names.forEach((name) => {
    const androidAsset = readFileSync(join(serviceDir, "..", "..", "android", "app", "src", "main", "res", "raw", `${name}.wav`));
    const webAsset = readFileSync(join(serviceDir, "..", "..", "assets", "audio", `${name}.wav`));
    assert.deepEqual(webAsset, androidAsset, `${name}.wav differs between Android and web`);
  });
});

test("iPhone Safari uses lightweight tones while other browsers keep the packaged sounds", () => {
  const iphoneSafari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1";
  const androidChrome = "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/136.0.0.0 Mobile Safari/537.36";
  assert.equal(webSoundPlaybackMode(iphoneSafari, 5), "tone");
  assert.equal(webSoundPlaybackMode(androidChrome, 5), "asset");
  assert.match(soundServiceSource, /playWebAsset\(name\)/);
  assert.match(soundServiceSource, /webSoundPlaybackMode\(navigator\.userAgent/);
});
