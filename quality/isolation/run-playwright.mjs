import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startPlaywrightServer } from "./playwright-server.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const project = process.argv.includes("--webkit") ? "webkit" : "chromium";
const playwrightCli = path.join(
  root,
  "node_modules",
  "@playwright",
  "test",
  "cli.js",
);

function run(env, extraArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [playwrightCli, "test", "-c", path.join(root, "quality/isolation/playwright.config.ts"), `--project=${project}`, ...extraArgs],
      { cwd: root, stdio: "inherit", env: { ...process.env, ...env } },
    );
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

const isolatedPort = Number(process.env.PUTDUK_OPS_QA_PORT || 4177);
const livePort = Number(process.env.PUTDUK_OPS_PW_LIVE_PORT || 4179);

const isolated = await startPlaywrightServer({ port: isolatedPort, apiOrigin: null });
let code = await run(
  {
    PUTDUK_OPS_PW_ORIGIN: isolated.origin,
    PUTDUK_OPS_QA_PORT: String(isolatedPort),
    PUTDUK_OPS_PW_LIVE: "0",
  },
  ["--grep-invert", "@live-unready"],
);
await isolated.close();
if (code !== 0) process.exit(code);

const live = await startPlaywrightServer({
  port: livePort,
  apiOrigin: `http://127.0.0.1:${livePort}`,
});
code = await run(
  {
    PUTDUK_OPS_PW_ORIGIN: live.origin,
    PUTDUK_OPS_QA_PORT: String(livePort),
    PUTDUK_OPS_PW_LIVE: "1",
  },
  ["--grep", "@live-unready"],
);
await live.close();
process.exit(code);
