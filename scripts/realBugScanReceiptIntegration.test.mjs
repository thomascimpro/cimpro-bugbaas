import assert from "node:assert/strict";
import test from "node:test";
import receiptModule from "../shared/realBugScanReceipt.cjs";
import functionReceiptModule from "../firebase/functions/realBugScanReceipt.cjs";

const sharedSecret = "integration-shared-secret";
const otherSecret = "integration-other-secret";

function createReceipt(secret = sharedSecret) {
  const signReceipt = receiptModule.createScanReceiptSigner({ secret });
  assert.ok(signReceipt);
  const receipt = signReceipt({
    uid: "integration-user",
    scanId: "integration-scan",
    status: "matched",
    identification: {
      bugId: "lieveheersbeestje",
      confidence: 0.95,
      commonName: "Lieveheersbeestje",
      scientificName: "Coccinellidae"
    }
  });
  const [, payload] = receipt.split(".");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  return { claims, receipt };
}

test("Vercel and Firebase accept a v2 receipt when configured with the same secret", () => {
  const { claims: issuedClaims, receipt } = createReceipt();
  const options = { secret: sharedSecret, uid: "integration-user", now: issuedClaims.issuedAt + 1000 };

  const sharedClaims = receiptModule.verifyScanReceipt(receipt, options);
  const firebaseClaims = functionReceiptModule.verifyScanReceipt(receipt, options);

  assert.equal(sharedClaims?.scanId, "integration-scan");
  assert.equal(firebaseClaims?.scanId, "integration-scan");
});

test("a v2 receipt signed with another secret is rejected", () => {
  const { claims: issuedClaims, receipt } = createReceipt(otherSecret);
  const options = { secret: sharedSecret, uid: "integration-user", now: issuedClaims.issuedAt + 1000, publicKey: undefined };

  assert.equal(receiptModule.verifyScanReceipt(receipt, options), undefined);
  assert.equal(functionReceiptModule.verifyScanReceipt(receipt, options), undefined);
});

test("a v2 receipt remains UID-bound", () => {
  const { claims: issuedClaims, receipt } = createReceipt();
  const options = { secret: sharedSecret, uid: "another-user", now: issuedClaims.issuedAt + 1000 };

  assert.equal(receiptModule.verifyScanReceipt(receipt, options), undefined);
  assert.equal(functionReceiptModule.verifyScanReceipt(receipt, options), undefined);
});

test("a v2 receipt expires after ten minutes", () => {
  const { claims: issuedClaims, receipt } = createReceipt();
  const acceptedOptions = { secret: sharedSecret, uid: "integration-user", now: issuedClaims.issuedAt + 9 * 60 * 1000 };
  const expiredOptions = { secret: sharedSecret, uid: "integration-user", now: issuedClaims.issuedAt + 11 * 60 * 1000 };

  assert.ok(receiptModule.verifyScanReceipt(receipt, acceptedOptions));
  assert.ok(functionReceiptModule.verifyScanReceipt(receipt, acceptedOptions));
  assert.equal(receiptModule.verifyScanReceipt(receipt, expiredOptions), undefined);
  assert.equal(functionReceiptModule.verifyScanReceipt(receipt, expiredOptions), undefined);
});
