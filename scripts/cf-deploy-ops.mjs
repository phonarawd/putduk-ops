#!/usr/bin/env node
/**
 * Deploy this Vinext admin to the live ops origin worker.
 * ops.putduk.com → ai-profit-ops Worker in the PUTDUK Cloudflare account.
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
  process.env.CLOUDFLARE_ACCOUNT_ID || "9dc502d4ef06b3b5374591de6e6933ca";
const ORIGIN_SMOKE =
  process.env.OPS_ORIGIN_SMOKE ||
  "https://ai-profit-ops.putduk-landing.workers.dev";
const PUBLIC_SMOKE = process.env.OPS_PUBLIC_SMOKE || "https://ops.putduk.com";

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

if (process.env.CLOUDFLARE_API_TOKEN) {
  const ACCOUNT = "9dc502d4ef06b3b5374591de6e6933ca";
  const ZONE = process.env.CLOUDFLARE_ZONE_ID || "c9e6c93451c3c2e107a1eca511bedaba";
  const DOMAIN_API = "https://api.cloudflare.com/client/v4";
  const headers = {
    authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    "content-type": "application/json",
  };
  if (ACCOUNT_ID !== ACCOUNT || ZONE !== "c9e6c93451c3c2e107a1eca511bedaba") {
    console.error("[cf-deploy-ops] refusing non-PUTDUK Cloudflare target");
    process.exit(1);
  }
  async function cf(path, init = {}) {
    const response = await fetch(DOMAIN_API + path, { ...init, headers: { ...headers, ...(init.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success === false) {
      throw new Error(`Cloudflare request failed ${response.status}: ${JSON.stringify(body.errors || body)}`);
    }
    return body.result;
  }
  const domains = await cf(`/accounts/${ACCOUNT}/workers/domains?zone_id=${ZONE}&hostname=ops.putduk.com`);
  for (const domain of domains || []) {
    if (domain.service !== WORKER_NAME) {
      console.log(`[cf-deploy-ops] detaching ops.putduk.com from ${domain.service}`);
      await cf(`/accounts/${ACCOUNT}/workers/domains/${domain.id}`, { method: "DELETE" });
    }
  }
  const current = await cf(`/accounts/${ACCOUNT}/workers/domains?zone_id=${ZONE}&hostname=ops.putduk.com&service=${encodeURIComponent(WORKER_NAME)}`);
  if (!(current || []).length) {
    await cf(`/accounts/${ACCOUNT}/workers/domains`, {
      method: "PUT",
      body: JSON.stringify({ hostname: "ops.putduk.com", service: WORKER_NAME }),
    });
  }
  const verify = await cf(`/accounts/${ACCOUNT}/workers/domains?zone_id=${ZONE}&hostname=ops.putduk.com`);
  if (!(verify || []).some((domain) => domain.service === WORKER_NAME)) {
    throw new Error("ops.putduk.com custom-domain verification failed");
  }
  console.log("[cf-deploy-ops] custom domain READY ops.putduk.com -> " + WORKER_NAME);
}

async function smoke(label, url) {
  const target = `${url.replace(/\/$/, "")}/admin?cb=${Date.now()}`;
  let last;
  for (let attempt = 1; attempt <= 8; attempt++) {
    let res;
    let html = "";
    try {
      res = await fetch(target, {
        redirect: "follow",
        headers: { "cache-control": "no-cache" },
      });
      html = await res.text();
    } catch (error) {
      console.log(
        `[cf-deploy-ops] smoke ${label} #${attempt} network error=${error?.message || error}`,
      );
      if (attempt < 8) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }
      throw error;
    }
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
