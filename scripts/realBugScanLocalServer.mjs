import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalog from "../shared/bugdex-catalog.json" with { type: "json" };
import { createFirebaseTokenVerifier } from "../server/realBugScan/firebaseTokenVerifier.mjs";
import { createFirebaseUsageStore } from "../server/realBugScan/firebaseUsageStore.mjs";
import { createRealBugIdentifyHandler } from "../server/realBugScan/handler.mjs";
import { createOpenAIImageIdentifier } from "../server/realBugScan/openaiVision.mjs";
import receiptModule from "../shared/realBugScanReceipt.cjs";

function loadEnvFile(filename) {
  const file = resolve(process.cwd(), filename);
  if (!existsSync(file)) return;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function readBody(request, maxBytes = 6_500_000) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Request body too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

loadEnvFile(".env");
loadEnvFile(".env.real-bug-scan.local");

const port = Number(process.env.BUG_SCAN_API_PORT || 8787);
const allowedOrigins = String(process.env.BUG_SCAN_ALLOWED_ORIGINS || "http://localhost:8081,http://localhost:19006")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const usageStore = createFirebaseUsageStore({ projectId: process.env.FIREBASE_PROJECT_ID });
const handler = createRealBugIdentifyHandler({
  catalog,
  allowedOrigins,
  verifyIdToken: createFirebaseTokenVerifier({ apiKey: process.env.FIREBASE_API_KEY }),
  checkUsage: usageStore.check,
  reserveUsage: usageStore.reserve,
  signReceipt: receiptModule.createScanReceiptSigner({ secret: process.env.BUG_SCAN_RECEIPT_SECRET }),
  identifyImage: createOpenAIImageIdentifier({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_BUG_SCAN_MODEL || "gpt-5-mini"
  })
});

const server = createServer(async (request, response) => {
  if (request.url !== "/api/real-bug-identify") {
    response.statusCode = 404;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ ok: false, error: "Route niet gevonden." }));
    return;
  }

  try {
    request.body = request.method === "POST" ? await readBody(request) : undefined;
    await handler(request, response);
  } catch {
    if (!response.headersSent) {
      response.statusCode = 413;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    if (!response.writableEnded) response.end(JSON.stringify({ ok: false, error: "Request is te groot." }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`BugBaas real bug scan API: http://127.0.0.1:${port}/api/real-bug-identify`);
});
