import assert from "node:assert/strict";
import test from "node:test";
import { bottomNavItems } from "./BottomNavModel.ts";

test("every bottom navigation destination uses bug art", () => {
  assert.deepEqual(
    bottomNavItems.map(({ route, bugId }) => ({ route, bugId })),
    [
      { route: "world", bugId: "zilvervisje" },
      { route: "scan", bugId: "springspin" },
      { route: "play", bugId: "neushoornkever" },
      { route: "collection", bugId: "lieveheersbeestje" }
    ]
  );
});
