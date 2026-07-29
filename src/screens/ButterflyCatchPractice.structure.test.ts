import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { playTabs } from "./PlayScreenModel.ts";

const root = dirname(fileURLToPath(import.meta.url));
const playSource = readFileSync(join(root, "PlayScreen.tsx"), "utf8");
const nativeEntrySource = readFileSync(join(root, "../components/butterflyCatch/ButterflyCatchGame.native.tsx"), "utf8");
const duelSource = readFileSync(join(root, "BugSmashDuelScreen.tsx"), "utf8");
const gameTypesSource = readFileSync(join(root, "../components/butterflyCatch/ButterflyCatchGame.types.ts"), "utf8");
const webGameSource = readFileSync(join(root, "../components/butterflyCatch/ButterflyCatchGame.web.tsx"), "utf8");
const i18nSource = readFileSync(join(root, "../services/i18n.tsx"), "utf8");
const prototypeSource = readFileSync(join(root, "../../prototypes/butterfly-catch-3d/prototype.js"), "utf8");

test("Wing Hunt 3D only appears in the shared Choose a game selector", () => {
  assert.doesNotMatch(playSource, /butterflyCatchOpen|butterflyCatchCard|Open Vlindervangst/);
  assert.match(duelSource, /<ArcadeModeCard[\s\S]*startRandomChallenge\("butterfly_catch"\)/);
  assert.match(duelSource, /butterfly-catch-keyart-v1\.webp/);
});

test("the 3D butterfly game uses the stronger Wing Hunt name", () => {
  assert.match(i18nSource, /"arcade\.butterflyCatch\.title": "Vleugeljacht 3D"/);
  assert.match(i18nSource, /"arcade\.butterflyCatch\.title": "Wing Hunt 3D"/);
  assert.match(webGameSource, /title: "BugBaas Vleugeljacht 3D"/);
});

test("timed game saves arcade results and is also wired into ranked matchmaking", () => {
  assert.deepEqual(playTabs, ["arcade", "ranking"]);
  assert.match(webGameSource, /saveButterflyCatchResult/);
  assert.match(duelSource, /startRandomChallenge\("butterfly_catch"\)/);
  assert.match(duelSource, /<ButterflyCatchGame[\s\S]*ranked/);
});

test("Android locks Wing Hunt and links to the BugBaas web app", () => {
  assert.match(gameTypesSource, /https:\/\/bugbaas\.vercel\.app/);
  assert.match(nativeEntrySource, /Linking\.openURL\(BUTTERFLY_CATCH_WEB_URL\)/);
  assert.doesNotMatch(nativeEntrySource, /WebView|android_asset|ReactNativeWebView/);
  assert.match(duelSource, /butterflyCatchWebOnly = Platform\.OS !== "web"/);
  assert.match(duelSource, /lockedLabel=\{butterflyCatchWebOnly \? "🔒 OPEN WEBVERSIE"/);
  assert.match(duelSource, /Linking\.openURL\(BUTTERFLY_CATCH_WEB_URL\)/);
});

test("the web game bridges completed scores to BugBaas", () => {
  assert.match(prototypeSource, /ReactNativeWebView\?\.postMessage/);
  assert.match(webGameSource, /run-complete/);
  assert.match(webGameSource, /saveButterflyCatchResult/);
});

test("web version embeds the playable 3D prototype without native GL imports", () => {
  assert.doesNotMatch(webGameSource, /expo-gl|expo-sensors|@react-three\/fiber\/native|from \"three\"/);
  assert.match(webGameSource, /butterfly-catch-3d\/index\.html/);
  assert.match(webGameSource, /React\.createElement\("iframe"/);
  assert.match(webGameSource, /run-complete/);
});
