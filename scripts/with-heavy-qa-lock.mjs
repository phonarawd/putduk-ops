import { mkdirSync, openSync, writeFileSync, closeSync, existsSync, readFileSync, unlinkSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const dir = path.join(process.env.LOCALAPPDATA || process.env.TMP || ".", "PUTDUK_HEAVY_QA_V1");
const lockPath = path.join(dir, "lock");
mkdirSync(dir, { recursive: true });

if (existsSync(lockPath)) {
  const existing = readFileSync(lockPath, "utf8").trim();
  console.error(`PUTDUK_HEAVY_QA_V1 잠금이 있어 이 검사를 시작하지 않습니다. 강제 해제하지 않습니다. ${existing}`);
  process.exit(2);
}

let fd;
try {
  fd = openSync(lockPath, "wx");
} catch {
  console.error("PUTDUK_HEAVY_QA_V1 잠금을 만들지 못했습니다. 다른 작업이 사용 중일 수 있어요.");
  process.exit(2);
}
writeFileSync(fd, `putduk-ops pid=${process.pid} at=${new Date().toISOString()}\n`);

const args = process.argv.slice(2);
if (args.length === 0) {
  releaseOwnLock();
  process.exit(0);
}

const child = spawn(args[0], args.slice(1), { stdio: "inherit", shell: true });
child.on("exit", (code) => {
  releaseOwnLock();
  process.exit(code ?? 1);
});
child.on("error", (err) => {
  console.error(err.message);
  releaseOwnLock();
  process.exit(1);
});

function releaseOwnLock() {
  try {
    closeSync(fd);
  } catch {
    /* already closed */
  }
  try {
    const current = readFileSync(lockPath, "utf8");
    if (current.includes(`pid=${process.pid}`)) unlinkSync(lockPath);
  } catch {
    /* 남의 잠금은 지우지 않음 */
  }
}
