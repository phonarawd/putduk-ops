import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function run(label, args) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`${label} exit ${result.status}`);
    process.exit(result.status ?? 1);
  }
  console.log(`${label} exit 0`);
}

const npm = process.env.npm_execpath;
if (!npm) {
  console.error("npm run 으로 실행해 주세요.");
  process.exit(1);
}

function npmRun(script) {
  return [npm, "run", script];
}

run("typecheck", npmRun("typecheck"));
run("lint", npmRun("lint"));
run("test:isolated-admin", npmRun("test:isolated-admin"));
run("build", npmRun("build"));
run("playwright chromium", [path.join(root, "quality/isolation/run-playwright.mjs")]);
run("playwright webkit", [path.join(root, "quality/isolation/run-playwright.mjs"), "--webkit"]);
run("conditional-live-gate", [path.join(root, "quality/isolation/run-conditional-live-integration.mjs")]);
console.log("\nmin-integration mock PASS. 실서버/DB PASS가 아닙니다. 조건부 실통합은 BLOCKED.");
