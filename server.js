import { createServer } from "node:http";
import { FileKVStore } from "./kv-store.js";

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || "/data/kv";

// Initialize file-based KV store
const kvStore = new FileKVStore(DATA_DIR);

// Import the Worker's fetch handler
const worker = await import("./_worker.js");

const server = createServer(async (req, res) => {
  try {
    // Build full URL
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host || `localhost:${PORT}`;
    const url = new URL(req.url, `${protocol}://${host}`);

    // Read request body
    let body = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      if (chunks.length) body = Buffer.concat(chunks);
    }

    // Convert to Web Request
    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers: req.headers,
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
  } catch (err) {
    console.error("Request error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
    }
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
});

server.listen(PORT, () => {
  console.log(`CF-TTS server running on http://localhost:${PORT}`);
});
