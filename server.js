import { createServer } from "node:http";
import { webcrypto } from "node:crypto";
import { FileKVStore } from "./kv-store.js";

// Polyfill globalThis.crypto for Node.js 18 (Cloudflare Workers has it globally)
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || "/data/kv";
const LOG_LEVEL = process.env.LOG_LEVEL || "info"; // debug, info, warn, error

// Initialize file-based KV store
const kvStore = new FileKVStore(DATA_DIR);

// Import the Worker's fetch handler
const worker = await import("./_worker.js");

function timestamp() {
  return new Date().toISOString();
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function log(level, ...args) {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  if (levels[level] >= levels[LOG_LEVEL]) {
    const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;
    if (level === "error") {
      console.error(prefix, ...args);
    } else if (level === "warn") {
      console.warn(prefix, ...args);
    } else {
      console.log(prefix, ...args);
    }
  }
}

const server = createServer(async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.headers["x-real-ip"]
    || req.socket.remoteAddress;

  try {
    // Build full URL
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host || `0.0.0.0:${PORT}`;
    const url = new URL(req.url, `${protocol}://${host}`);

    log("debug", `→ ${req.method} ${url.pathname} from ${clientIp}`);

    // Read request body
    let body = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      if (chunks.length) body = Buffer.concat(chunks);
    }

    // Convert to Web Request (filter out Node.js-specific headers that are forbidden in Web API)
    const filteredHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'host'].includes(key.toLowerCase()) && value !== undefined) {
        filteredHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
      }
    }
    filteredHeaders['host'] = host;

    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers: filteredHeaders,
      body,
      duplex: "half",
    });

    // Call the Worker's fetch handler
    const env = {
      API_KEY: process.env.API_KEY || "",
      TTS_HISTORY: kvStore,
    };
    const webResponse = await worker.default.fetch(webRequest, env, {});

    // Write status & headers
    const headers = {};
    webResponse.headers.forEach((v, k) => {
      headers[k] = v;
    });
    res.writeHead(webResponse.status, headers);

    // Write body
    if (webResponse.body) {
      const reader = webResponse.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();

    const duration = Date.now() - startTime;
    const status = webResponse.status;
    const logLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    log(logLevel, `${req.method} ${url.pathname} ${status} ${formatDuration(duration)} [${clientIp}]`);

  } catch (err) {
    const duration = Date.now() - startTime;
    log("error", `${req.method} ${req.url} 500 ${formatDuration(duration)} [${clientIp}] -`, err.message);
    log("debug", err.stack);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
    }
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  log("info", `CF-TTS server v1.2 started on http://0.0.0.0:${PORT}`);
  log("info", `API_KEY: ${process.env.API_KEY ? "configured" : "not set (open access)"}`);
  log("info", `DATA_DIR: ${DATA_DIR}`);
  log("info", `LOG_LEVEL: ${LOG_LEVEL}`);
});

// Graceful shutdown
function shutdown() {
  log("info", "Shutting down gracefully...");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Catch unhandled errors
process.on('uncaughtException', (err) => {
  log("error", "Uncaught exception:", err.message);
  log("debug", err.stack);
});
process.on('unhandledRejection', (reason) => {
  log("error", "Unhandled rejection:", reason);
});
