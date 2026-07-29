import http from "node:http";
import handler from "../api/nearby-search-zones.js";

const port = Number(process.env.BUGBAAS_ZONES_PORT || 8084);
const allowedOrigins = new Set(["http://localhost:8081", "http://localhost:8083", "http://localhost:19006"]);

const server = http.createServer(async (request, response) => {
  const requestOrigin = String(request.headers.origin || "");
  if (allowedOrigins.has(requestOrigin)) response.setHeader("Access-Control-Allow-Origin", requestOrigin);
  response.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url || "/", `http://${request.headers.host || `localhost:${port}`}`);
  if (url.pathname !== "/api/nearby-search-zones") {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  const query = Object.fromEntries(url.searchParams.entries());
  const adapter = {
    setHeader(name, value) { response.setHeader(name, value); },
    status(code) { response.statusCode = code; return adapter; },
    json(payload) {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(payload));
      return adapter;
    }
  };

  await handler({ method: request.method, query }, adapter);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`BugBaas nearby search zones proxy listening on http://localhost:${port}`);
});
