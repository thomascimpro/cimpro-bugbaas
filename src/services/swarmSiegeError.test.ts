import assert from "node:assert/strict";
import test from "node:test";
import { swarmSiegeRequestError } from "./swarmSiegeError.ts";

test("classifies Swarm Siege request failures for the UI", () => {
  assert.equal(swarmSiegeRequestError(new TypeError("Failed to fetch")), "Geen verbinding met de eventserver. Controleer je internetverbinding.");
  assert.equal(swarmSiegeRequestError(null, 401), "Je sessie is verlopen. Log opnieuw in.");
  assert.equal(swarmSiegeRequestError(null, 404), "Zwermbeleg is nog niet beschikbaar op deze versie.");
  assert.equal(swarmSiegeRequestError(null, 503), "De eventserver is tijdelijk niet bereikbaar.");
  assert.equal(swarmSiegeRequestError(null, 400, "Invalid run ID."), "Invalid run ID.");
});
