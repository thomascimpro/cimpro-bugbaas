import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const serviceSource = readFileSync(fileURLToPath(new URL("./fieldJournalService.ts", import.meta.url)), "utf8");
const functionsSource = readFileSync(fileURLToPath(new URL("../../firebase/functions/index.js", import.meta.url)), "utf8");

test("field journal entries are read through the authenticated server endpoint", () => {
  assert.match(serviceSource, /listVerifiedObservations/);
  assert.match(serviceSource, /Authorization: `Bearer \$\{await currentUser\.getIdToken\(\)\}`/);
  assert.doesNotMatch(serviceSource, /getDocs\(query\(collection\(db, "users", user\.uid, "verifiedObservations"\)/);
});

test("listVerifiedObservations returns only the authenticated user's latest entries", () => {
  assert.match(functionsSource, /exports\.listVerifiedObservations = onRequest/);
  assert.match(functionsSource, /requireGet\(req\)/);
  assert.match(functionsSource, /authenticatedUid\(req\)/);
  assert.match(functionsSource, /collection\("verifiedObservations"\)\.orderBy\("observedAt", "desc"\)\.limit\(60\)/);
});

test("field-note endpoints accept the two trusted BugBaas Firebase audiences", () => {
  assert.match(functionsSource, /trustedAuthProjectIds = new Set\(\["thomascimpro-6266f", "bugbaas-3"\]\)/);
  assert.match(functionsSource, /authProjectIdFromToken/);
  assert.match(functionsSource, /getAuth\(authAppForProject\(projectId\)\)\.verifyIdToken\(token\)/);
});

test("verified field notes store only the supported optional tags", () => {
  assert.match(serviceSource, /tags: FieldJournalTag\[\] = \[\]/);
  assert.match(serviceSource, /tags\n/);
  assert.match(functionsSource, /normalizeFieldJournalTags/);
  assert.match(functionsSource, /tags\.length > 3/);
});
