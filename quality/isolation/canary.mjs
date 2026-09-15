import http from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export function startCanary(stateFile) {
  const hits = [];

  async function persist() {
    await mkdir(path.dirname(stateFile), { recursive: true });
    await writeFile(stateFile, JSON.stringify({ hits }, null, 2), "utf8");
  }

  const server = http.createServer((req, res) => {
    const url = req.url || "/";
    if (url === "/health") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, hits: hits.length }));
      return;
    }
    hits.push({ at: new Date().toISOString(), method: req.method || "GET", url });
    void persist();
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ canary: true, hits: hits.length }));
  });

  return {
    server,
    hits,
    listen(port) {
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => resolve());
      });
    },
    close() {
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}
