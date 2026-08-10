import assert from "node:assert/strict";
import test from "node:test";
import { encodeWebRouteSnapshot, readRecentWebRoute, webRouteRecoveryTtlMs } from "./webRouteRecovery";

const routes = new Set(["home", "duel"]);

test("restores a recent valid web route after a Safari reload", () => {
  const now = 10_000;
  assert.equal(readRecentWebRoute(encodeWebRouteSnapshot("duel", now), routes, now + 1_000), "duel");
});

test("does not restore stale, malformed or unknown web routes", () => {
  const now = 10_000;
  assert.equal(readRecentWebRoute(encodeWebRouteSnapshot("duel", now), routes, now + webRouteRecoveryTtlMs + 1), null);
  assert.equal(readRecentWebRoute(encodeWebRouteSnapshot("settings", now), routes, now), null);
  assert.equal(readRecentWebRoute("not-json", routes, now), null);
});
