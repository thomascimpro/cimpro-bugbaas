const {
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  sign: signAsymmetric,
  timingSafeEqual,
  verify: verifyAsymmetric
} = require("node:crypto");

const SCAN_RECEIPT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA5Tzxi1AdUJo65hzumlzAekxb4c2Y/6+dlHGdciqbFKw=
-----END PUBLIC KEY-----`;
const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signLegacy(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function privateKeyFromSecret(secret) {
  const seed = createHash("sha256").update(String(secret)).digest();
  return createPrivateKey({ key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]), format: "der", type: "pkcs8" });
}

function verificationKeys(secret, publicKey) {
  const keys = [];
  if (secret) keys.push(createPublicKey(privateKeyFromSecret(secret)));
  if (publicKey) keys.push(createPublicKey(publicKey));
  return keys;
}

function receiptClaims({ uid, scanId, status, identification, version }) {
  return {
    bugId: identification.bugId,
    confidence: identification.confidence,
    issuedAt: Date.now(),
    scanId,
    scientificName: identification.scientificName,
    speciesName: identification.commonName,
    status,
    uid,
    v: version
  };
}

function createScanReceiptSigner({ secret } = {}) {
  if (!secret) return undefined;
  const privateKey = privateKeyFromSecret(secret);
  return ({ uid, scanId, status, identification }) => {
    const payload = encode(receiptClaims({ uid, scanId, status, identification, version: 2 }));
    const signature = signAsymmetric(null, Buffer.from(payload), privateKey).toString("base64url");
    return `v2.${payload}.${signature}`;
  };
}

function validClaims(claims, { uid, now, ttlMs, version }) {
  if (claims.v !== version || claims.uid !== uid || typeof claims.scanId !== "string") return undefined;
  if (!Number.isFinite(claims.issuedAt) || claims.issuedAt > now + 30_000 || now - claims.issuedAt > ttlMs) return undefined;
  if (!["matched", "not_in_catalog"].includes(claims.status)) return undefined;
  if (typeof claims.speciesName !== "string" || typeof claims.scientificName !== "string") return undefined;
  if (!(claims.bugId === null || typeof claims.bugId === "string")) return undefined;
  if (typeof claims.confidence !== "number" || claims.confidence < 0 || claims.confidence > 1) return undefined;
  return claims;
}

function parsePayload(payload, options) {
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return validClaims(claims, options);
  } catch {
    return undefined;
  }
}

function verifyScanReceipt(receipt, { secret, uid, now = Date.now(), ttlMs = 10 * 60 * 1000, publicKey = SCAN_RECEIPT_PUBLIC_KEY } = {}) {
  if (typeof receipt !== "string") return undefined;
  const parts = receipt.split(".");

  if (parts.length === 3 && parts[0] === "v2") {
    const [, payload, signature] = parts;
    if (!payload || !signature) return undefined;
    try {
      const signatureBuffer = Buffer.from(signature, "base64url");
      const accepted = verificationKeys(secret, publicKey)
        .some((key) => verifyAsymmetric(null, Buffer.from(payload), key, signatureBuffer));
      return accepted ? parsePayload(payload, { uid, now, ttlMs, version: 2 }) : undefined;
    } catch {
      return undefined;
    }
  }

  if (!secret || parts.length !== 2) return undefined;
  const [payload, signature] = parts;
  if (!payload || !signature || !safeEqual(signLegacy(payload, secret), signature)) return undefined;
  return parsePayload(payload, { uid, now, ttlMs, version: 1 });
}

module.exports = { SCAN_RECEIPT_PUBLIC_KEY, createScanReceiptSigner, verifyScanReceipt };
