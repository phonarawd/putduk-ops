#!/usr/bin/env node
/**
 * Deploy this Vinext admin to the live ops origin worker.
 * ops.hiptk.app → hiptk-ops-proxy → https://ai-profit-ops.ebay-adapter.workers.dev
 * Do not attach ops.hiptk.app here — the proxy already owns that hostname.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wranglerBin = join(root, "node_modules/wrangler/bin/wrangler.js");
const generatedConfig = join(root, "dist/server/wrangler.json");

const WORKER_NAME = process.env.OPS_WORKER_NAME || "ai-profit-ops";
const ACCOUNT_ID =
  process.env.CLOUDFLARE_ACCOUNT_ID || "190a1476a068cfe96dfe1029877587ef";
const ORIGIN_SMOKE =
  process.env.OPS_ORIGIN_SMOKE ||
  "https://ai-profit-ops.ebay-adapter.workers.dev";
const PUBLIC_SMOKE = process.env.OPS_PUBLIC_SMOKE || "https://ops.hiptk.app";

const noRebuild = process.argv.includes("--no-rebuild");

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function requireAuth() {
  if (process.env.CLOUDFLARE_API_TOKEN) return;
  const who = spawnSync(process.execPath, [wranglerBin, "whoami"], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  const out = `${who.stdout || ""}${who.stderr || ""}`;
  if (who.status !== 0 || /not authenticated/i.test(out)) {
    console.error(
      "[cf-deploy-ops] Cloudflare 인증이 없습니다. CLOUDFLARE_API_TOKEN 을 넣거나 wrangler login --device 를 먼저 하세요.",
    );
    process.exit(1);
  }
}

requireAuth();

if (!noRebuild) {
  console.log("[cf-deploy-ops] building");
  run("npm", ["run", "build"]);
}

let config;
try {
  config = JSON.parse(readFileSync(generatedConfig, "utf8"));
} catch {
  console.error("[cf-deploy-ops] missing dist/server/wrangler.json — run npm run build");
  process.exit(1);
}

config.name = WORKER_NAME;
config.account_id = ACCOUNT_ID;
config.workers_dev = true;
config.vars = {
  ...(config.vars && typeof config.vars === "object" ? config.vars : {}),
  APP_NAME: "퍼뜩 관리",
  ROBOTS: "noindex, nofollow",
};
delete config.routes;
delete config.route;

writeFileSync(generatedConfig, JSON.stringify(config, null, 2) + "\n");
console.log(`[cf-deploy-ops] worker=${WORKER_NAME} account=${ACCOUNT_ID}`);

run(process.execPath, [
  wranglerBin,
  "deploy",
  "--config",
  generatedConfig,
  "--keep-vars",
]);

const zoneId = process.env.CLOUDFLARE_ZONE_ID || "a8f07448b300cf7f0215a3bbb9cf705e";
if (process.env.CLOUDFLARE_API_TOKEN) {
  const purge = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ hosts: ["ops.hiptk.app"] }),
    },
  );
  const body = await purge.json().catch(() => ({}));
  console.log(
    `[cf-deploy-ops] purge ops.hiptk.app ${purge.status} success=${Boolean(body.success)}`,
  );
}

async function smoke(label, url) {
  const target = `${url.replace(/\/$/, "")}/admin?cb=${Date.now()}`;
  let last;
  for (let attempt = 1; attempt <= 8; attempt++) {
    const res = await fetch(target, {
      redirect: "follow",
      headers: { "cache-control": "no-cache" },
    });
    const html = await res.text();
    const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "";
    const putduk = html.includes("퍼뜩") || title.includes("퍼뜩");
    const legacy = html.includes("AI Profit OS Ops");
    last = { url: target, status: res.status, title, putduk, legacy };
    console.log(
      `[cf-deploy-ops] smoke ${label} #${attempt} ${res.status} title=${title.replace(/\s+/g, " ").trim()} putduk=${putduk} legacy=${legacy}`,
    );
    if (res.status < 400 && putduk && !legacy) return last;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  if (last?.status >= 400) throw new Error(`${label} HTTP ${last.status}`);
  if (last?.legacy && !last.putduk) {
    throw new Error(`${label} still serving AI Profit OS Ops`);
  }
  return last;
}

const origin = await smoke("origin", ORIGIN_SMOKE);
const pub = await smoke("public", PUBLIC_SMOKE);
if (!origin.putduk && !pub.putduk) {
  console.error("[cf-deploy-ops] 배포 후 퍼뜩 관리 화면을 확인하지 못했습니다.");
  process.exit(1);
}
console.log("[cf-deploy-ops] ok", PUBLIC_SMOKE + "/admin");
