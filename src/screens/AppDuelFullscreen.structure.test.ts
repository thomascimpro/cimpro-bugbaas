import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appSource = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../../App.tsx"), "utf8");

test("starting a fullscreen duel does not remount the PlayScreen tree", () => {
  assert.doesNotMatch(appSource, /const Shell = duelFullscreen \? View : SafeAreaView;/);
  assert.match(appSource, /<SafeAreaView style=\{\[styles\.shell, !duelFullscreen && responsiveShellStyle, duelFullscreen && styles\.gameShell\]\}>/);
});

test("only earned BugDex foregrounds can appear over the duel workspace", () => {
  assert.match(appSource, /const foregroundBugEnabled = foregroundUiClear && !duelFullscreen/);
  assert.match(appSource, /enabled=\{foregroundBugEnabled \|\| forcedForegroundRewardEnabled\}/);
  assert.match(appSource, /forcedBugIds=\{pendingForegroundRewards\.map\(\(reward\) => reward\.bugId\)\}/);
});
