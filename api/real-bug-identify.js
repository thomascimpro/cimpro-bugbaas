const catalog = require("../shared/bugdex-catalog.json");
const receiptModule = require("../shared/realBugScanReceipt.cjs");

let configuredHandler;

function upstreamScanUrl() {
  const baseUrl = String(process.env.REAL_BUG_SCAN_UPSTREAM_URL || "").replace(/\/+$/, "");
  return baseUrl ? `${baseUrl}/api/real-bug-identify` : "";
}

async function proxyToUpstream(request, response) {
  const url = upstreamScanUrl();
  if (!url) return false;
  if (String(request.method || "GET").toUpperCase() === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return true;
  }
  const body = typeof request.body === "string" ? request.body : JSON.stringify(request.body || {});
  const upstreamResponse = await fetch(url, {
    body,
    headers: {
      Authorization: String(request.headers?.authorization || request.headers?.Authorization || ""),
      "Content-Type": "application/json"
    },
    method: String(request.method || "POST").toUpperCase()
  });
  response.statusCode = upstreamResponse.status;
  response.setHeader("Content-Type", upstreamResponse.headers.get("content-type") || "application/json");
  response.end(await upstreamResponse.text());
  return true;
}

async function getHandler() {
  if (configuredHandler) return configuredHandler;
  const [handlerModule, openaiModule, firebaseModule, usageModule] = await Promise.all([
    import("../server/realBugScan/handler.mjs"),
    import("../server/realBugScan/openaiVision.mjs"),
    import("../server/realBugScan/firebaseTokenVerifier.mjs"),
    import("../server/realBugScan/firebaseUsageStore.mjs")
  ]);

  const allowedOrigins = String(process.env.BUG_SCAN_ALLOWED_ORIGINS || "https://bugbaas.vercel.app")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const usageStore = usageModule.createFirebaseUsageStore({
    projectId: process.env.FIREBASE_PROJECT_ID
  });

  configuredHandler = handlerModule.createRealBugIdentifyHandler({
    catalog,
    allowedOrigins,
    verifyIdToken: firebaseModule.createFirebaseTokenVerifier({
      apiKey: process.env.FIREBASE_API_KEY
    }),
    checkUsage: usageStore.check,
    reserveUsage: usageStore.reserve,
    signReceipt: receiptModule.createScanReceiptSigner({ secret: process.env.BUG_SCAN_RECEIPT_SECRET }),
    identifyImage: openaiModule.createOpenAIImageIdentifier({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_BUG_SCAN_MODEL || "gpt-5-mini"
    })
  });
  return configuredHandler;
}

module.exports = async function realBugIdentifyApi(request, response) {
  if (!process.env.OPENAI_API_KEY && await proxyToUpstream(request, response)) return;
  const handler = await getHandler();
  return handler(request, response);
};
