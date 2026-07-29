import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appSource = await readFile(resolve(dirname(fileURLToPath(import.meta.url)), "../../App.tsx"), "utf8");

test("starting a fullscreen duel does not remount the PlayScreen tree", () => {
  assert.doesNotMatch(appSource, /const Shell = duelFullscreen \? View : SafeAreaView;/);
  assert.match(appSource, /<SafeAreaView style=\{\[styles\.shell, !duelFullscreen && responsiveShellStyle, duelFullscreen && styles\.gameShell\]\}>/);
});
