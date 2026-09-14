import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import react from "@vitejs/plugin-react";
import { assertNoProdHost, isIsolatedAllowed } from "./allowlist.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const indexHtml = path.join(root, "quality/isolation/playwright-index.html");

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function handleMockApi(req, url, res) {
  const method = (req.method || "GET").toUpperCase();
  const p = url.pathname;
  if (method === "GET" && p === "/api/v1/admin-session") {
    sendJson(res, 200, { connected: false });
    return true;
  }
  if (method === "POST" && p === "/api/v1/admin-session/login") {
    sendJson(res, 503, { code: "STORE_UNREADY", applied: false, storeStatus: "unready", statusCode: 503 });
    return true;
  }
  if (method === "POST" && p === "/api/v1/admin-session/logout") {
    sendJson(res, 200, { connected: false });
    return true;
  }
  if (method === "GET" && p === "/api/v1/admin/users") {
    const q = String(url.searchParams.get("q") || "").trim();
    if (!q) {
      sendJson(res, 503, { code: "STORE_UNREADY", applied: false, storeStatus: "unready" });
      return true;
    }
    sendJson(res, 404, { code: "NOT_FOUND", message: "user not found" });
    return true;
  }
  if (method === "POST" && p === "/api/v1/admin/opportunities/operator-products") {
    sendJson(res, 503, { code: "STORE_UNREADY", applied: false, storeStatus: "unready" });
    return true;
  }
  if (p.startsWith("/api/v1/")) {
    sendJson(res, 503, { code: "STORE_UNREADY", applied: false, storeStatus: "unready" });
    return true;
  }
  return false;
}

export async function startPlaywrightServer({ port, apiOrigin }) {
  const originLiteral = apiOrigin ? JSON.stringify(apiOrigin) : "undefined";
  const vite = await createViteServer({
    configFile: false,
    root,
    appType: "custom",
    plugins: [react()],
    resolve: {
      alias: {
        "next/link": path.join(root, "quality/isolation/shims/next-link.tsx"),
      },
    },
    server: { middlewareMode: true, hmr: false },
    define: {
      "process.env.NODE_ENV": JSON.stringify("test"),
      "process.env.NEXT_PUBLIC_PUTDUK_ADMIN_API_ORIGIN": originLiteral,
      "process.env.PUTDUK_ADMIN_API_ORIGIN": originLiteral,
      "process.env.NEXT_PUBLIC_PUTDUK_OPS_ISOLATED_QA": "undefined",
      "process.env.PUTDUK_OPS_ISOLATED_QA": "undefined",
    },
  });

  const server = http.createServer((req, res) => {
    void (async () => {
      try {
        const host = req.headers.host || `127.0.0.1:${port}`;
        const url = new URL(req.url || "/", `http://${host}`);
        assertNoProdHost(url);
        if (!isIsolatedAllowed(url, String(port))) {
          res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
          res.end("격리 허용 목록 밖 요청을 거절했습니다.");
          return;
        }
        if (handleMockApi(req, url, res)) return;
        vite.middlewares(req, res, async () => {
          const raw = fs.readFileSync(indexHtml, "utf8");
          const html = await vite.transformIndexHtml(url.pathname, raw);
          res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          res.end(html);
        });
      } catch (err) {
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        res.end(String(err && err.message ? err.message : err));
      }
    })();
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  return {
    origin: `http://127.0.0.1:${port}`,
    async close() {
      await new Promise((resolve) => server.close(() => resolve()));
      await vite.close();
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PUTDUK_OPS_QA_PORT || 4177);
  const api = process.env.PUTDUK_OPS_PW_LIVE === "1" ? `http://127.0.0.1:${port}` : null;
  const started = await startPlaywrightServer({ port, apiOrigin: api });
  console.log(`playwright-server ${started.origin} live=${Boolean(api)}`);
}
