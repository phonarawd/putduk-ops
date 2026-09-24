import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const fail = (message) => {
  console.error(`PHASE06_ASSERTION_FAILED: ${message}`);
  process.exitCode = 1;
};
const requireText = (source, needle, label) => {
  if (!source.includes(needle)) fail(`${label}: missing ${JSON.stringify(needle)}`);
};
const forbid = (source, pattern, label) => {
  if (pattern.test(source)) fail(`${label}: forbidden pattern ${String(pattern)}`);
};

const miningClient = read("lib/admin/mining.ts");
const adminClient = read("lib/admin/client.ts");
const screen = read("app/admin-screens/mining-screen.tsx");
const shell = read("app/admin-app.tsx");
const proxy = read("app/api/v1/[...path]/route.ts");
const theme = read("app/mining.css");

// Locked PHASE05 admin API surface. Do not invent mining endpoints in Ops.
for (const route of [
  "/admin/mines",
  "/rates",
  "/schedule",
  "/admin/mining/positions",
  "/admin/mining/settlements",
  "/retry",
  "/admin/system-control/switches",
]) {
  requireText(miningClient, route, "locked admin route coverage");
}

// Dynamic action routes are intentionally built from narrow allowlists. Verify both
// the allowlist and the exact route template instead of requiring impossible literal
// substrings such as "/publish" inside a `${action}` template.
requireText(
  miningClient,
  'action: "publish" | "pause-new-positions" | "pause" | "resume" | "end"',
  "locked mine action allowlist",
);
requireText(
  miningClient,
  '`/admin/mines/${encodeURIComponent(mineId)}/${action}`',
  "locked mine action route template",
);
requireText(
  miningClient,
  'action: "request-approval" | "approve"',
  "locked rate action allowlist",
);
requireText(
  miningClient,
  '`/admin/mines/${encodeURIComponent(mineId)}/rates/${encodeURIComponent(rateVersionId)}/${action}`',
  "locked rate action route template",
);

requireText(miningClient, '"Idempotency-Key"', "admin mutation idempotency");
requireText(miningClient, "MINING_NEW_POSITIONS_PAUSE", "new-position kill switch");
requireText(miningClient, "MINING_SETTLEMENT_PAUSE", "settlement kill switch");
requireText(adminClient, "...(opts?.headers ?? {})", "shared admin client custom headers");
requireText(proxy, "request.headers.forEach", "same-origin proxy request header forwarding");

// Required PHASE06 operator areas.
for (const label of [
  "오늘 할 일",
  "광산 관리",
  "수익률 관리",
  "운용 현황",
  "정산 관리",
  "시스템 제어",
]) {
  requireText(shell, label, "primary mine OS navigation");
}
for (const route of [
  "/mine/mines",
  "/mine/rates",
  "/mine/positions",
  "/mine/settlements",
  "/mine/system",
]) {
  requireText(shell, route, "mine OS route registration");
}

// High-value review is now an actual Backend contract. Verify the connected Ops surface,
 // while still forbidding direct Supabase access and optimistic mutation state.
requireText(screen, 'label="고액운용"', "high-value navigation/task label");
requireText(screen, '"/mine/high-value"', "high-value route surface");
requireText(miningClient, "listHighValueReviews", "high-value list client");
requireText(miningClient, "approveHighValueReview", "high-value approve client");
requireText(miningClient, "rejectHighValueReview", "high-value reject client");
requireText(screen, "PENDING", "high-value pending state");
requireText(screen, "거절 사유", "high-value rejection reason field");

 // Trial configuration is also a server-owned Ops contract.
requireText(screen, 'data-testid="mine-trial-config"', "trial config screen");
requireText(screen, '"/mine/trial"', "trial config route");
requireText(miningClient, "getTrialConfig", "trial config GET client");
requireText(miningClient, "updateTrialConfig", "trial config PATCH client");
requireText(screen, "변경 사유는 8자 이상 입력해 주세요.", "trial config reason validation");

// Maker/checker and server-authoritative success handling.
requireText(screen, "selected.createdByAdminId === adminId", "maker/checker self-approval guard");
requireText(screen, "작성자는 승인할 수 없음", "maker/checker UX");
requireText(screen, "if (!res.ok)", "mutation error branch");
requireText(screen, "notify(\"광산을 생성했습니다.\")", "success notification after API result");
requireText(screen, "서버가 성공하기 전에는 완료로 표시하지 않습니다", "no optimistic settlement success");

// Mining UI must never bypass Nest into Supabase or introduce a Vercel dependency.
for (const [name, source] of [["mining client", miningClient], ["mining screen", screen], ["admin shell", shell]]) {
  forbid(source, /@supabase|createClient\s*\(|supabase\.co|\.from\s*\(/i, `${name} direct Supabase access`);
  forbid(source, /vercel/i, `${name} Vercel dependency`);
}

// Human-facing state labels and Mineral Luxury visual tokens.
for (const label of ["준비", "가동", "신규운용중지", "승인대기", "운용중", "원장반영완료", "검토필요"]) {
  requireText(miningClient, label, "Korean operator status label");
}
for (const token of ["--mine-gold", "--mine-graphite", "--mine-danger", "@media (prefers-color-scheme: dark)"]) {
  requireText(theme, token, "Mineral Luxury theme");
}

if (!process.exitCode) console.log("PHASE06_OPS_CONSOLE_ASSERTIONS_PASS");
