import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appSource = await readFile(resolve(dirname(fileURLToPath(import.meta.url)), "../../App.tsx"), "utf8");

test("AppOverlayHost renders the buddy overlay instead of swallowing the click", () => {
  assert.match(appSource, /import \{ BuddyOverlay \} from "\.\/src\/components\/BuddyOverlay";/);
  assert.match(appSource, /renderOverlay=\{\(overlay\) => overlay\.type === "buddy"/);
});
