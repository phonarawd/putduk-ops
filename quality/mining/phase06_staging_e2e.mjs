import { createHmac, randomUUID } from "node:crypto";

const baseUrl = (process.env.PHASE06_API_BASE_URL || "https://putduk-mine-api-staging.onrender.com").replace(/\/+$/, "");
const secret = process.env.JWT_ADMIN_SECRET || "";
const makerId = process.env.PHASE06_MAKER_ADMIN_ID || "";
const checkerId = process.env.PHASE06_CHECKER_ADMIN_ID || "";

if (secret.length < 32) throw new Error("JWT_ADMIN_SECRET (>=32 chars) is required");
if (!makerId || !checkerId) throw new Error("PHASE06_MAKER_ADMIN_ID and PHASE06_CHECKER_ADMIN_ID are required");
if (makerId === checkerId) throw new Error("maker/checker admin ids must be different");

const issuer = "ai-profit-os-admin";
const audience = "aipo-ops";

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signAdmin(adminId) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    sub: adminId,
    role: "super",
    iss: issuer,
    aud: audience,
    iat: now,
    exp: now + 15 * 60,
    jti: randomUUID(),
  }));
  const data = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(data).digest();
  return `${data}.${base64url(signature)}`;
}

const makerToken = signAdmin(makerId);
const checkerToken = signAdmin(checkerId);

async function request(method, path, token, body, expected = [200, 201]) {
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    headers["Idempotency-Key"] = `phase06-${randomUUID()}`;
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!expected.includes(response.status)) {
    throw new Error(`${method} ${path} expected ${expected.join("/")} but got ${response.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return { status: response.status, data };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const suffix = `${Date.now().toString(36)}${randomUUID().replaceAll("-", "").slice(0, 6)}`.toUpperCase();
const code = `E2E_${suffix}`.slice(0, 60);
const reason = "PHASE06 격리 staging maker checker 검증입니다.";

console.log("PHASE06_STAGING_E2E_START", { baseUrl, code });

const createdMine = await request("POST", "/api/v1/admin/mines", makerToken, {
  code,
  displayName: `PHASE06 E2E ${suffix.slice(-6)}`,
  description: "PHASE06 staging 전용 검증 광산",
  assetCode: "XAU",
  minPrincipalAmount: "10",
  maxPrincipalAmount: "1000",
  displayOrder: 999999,
  reason,
});
const mineId = createdMine.data?.mineId;
assert(typeof mineId === "string" && mineId, "mineId missing after create");
assert(createdMine.data?.status === "READY", `expected READY mine, got ${createdMine.data?.status}`);
console.log("PASS mine create", mineId);

const createdRate = await request("POST", `/api/v1/admin/mines/${encodeURIComponent(mineId)}/rates`, makerToken, {
  dailyRate: "0.001",
  reason,
});
const rateVersionId = createdRate.data?.rateVersionId;
assert(typeof rateVersionId === "string" && rateVersionId, "rateVersionId missing after create");
assert(createdRate.data?.status === "DRAFT", `expected DRAFT rate, got ${createdRate.data?.status}`);
console.log("PASS rate draft", rateVersionId);

const requested = await request("POST", `/api/v1/admin/mines/${encodeURIComponent(mineId)}/rates/${encodeURIComponent(rateVersionId)}/request-approval`, makerToken, { reason });
assert(requested.data?.status === "APPROVAL_PENDING", `expected APPROVAL_PENDING, got ${requested.data?.status}`);
console.log("PASS approval request");

const selfApproval = await request(
  "POST",
  `/api/v1/admin/mines/${encodeURIComponent(mineId)}/rates/${encodeURIComponent(rateVersionId)}/approve`,
  makerToken,
  { reason },
  [409],
);
console.log("PASS maker self-approval rejected", selfApproval.status);

const approved = await request("POST", `/api/v1/admin/mines/${encodeURIComponent(mineId)}/rates/${encodeURIComponent(rateVersionId)}/approve`, checkerToken, { reason });
assert(approved.data?.approvedAt, "approvedAt missing after checker approval");
assert(approved.data?.approvedByAdminId === checkerId, "checker identity was not persisted as approver");
console.log("PASS checker approval");

const effectiveAt = new Date(Date.now() - 1000).toISOString();
const activated = await request("POST", `/api/v1/admin/mines/${encodeURIComponent(mineId)}/rates/${encodeURIComponent(rateVersionId)}/schedule`, makerToken, {
  effectiveAt,
  reason,
});
assert(activated.data?.status === "ACTIVE", `expected ACTIVE rate after immediate schedule, got ${activated.data?.status}`);
console.log("PASS rate activation");

const published = await request("POST", `/api/v1/admin/mines/${encodeURIComponent(mineId)}/publish`, makerToken, { reason });
assert(published.data?.status === "ACTIVE", `expected ACTIVE mine after publish, got ${published.data?.status}`);
console.log("PASS mine publish");

const mineRead = await request("GET", `/api/v1/admin/mines/${encodeURIComponent(mineId)}`, makerToken);
assert(mineRead.data?.status === "ACTIVE", `mine readback status mismatch: ${mineRead.data?.status}`);
const readRate = Array.isArray(mineRead.data?.rateVersions)
  ? mineRead.data.rateVersions.find((row) => row.rateVersionId === rateVersionId)
  : null;
assert(readRate?.status === "ACTIVE", `rate readback status mismatch: ${readRate?.status}`);
assert(readRate?.approvedByAdminId === checkerId, "rate readback checker identity mismatch");
console.log("PASS active readback");

const ended = await request("POST", `/api/v1/admin/mines/${encodeURIComponent(mineId)}/end`, makerToken, { reason });
assert(ended.data?.status === "ENDED", `expected ENDED cleanup state, got ${ended.data?.status}`);
console.log("PASS staging cleanup end");

console.log("PHASE06_STAGING_E2E_PASS", {
  mineId,
  rateVersionId,
  makerCheckerSeparated: true,
  finalMineStatus: ended.data.status,
});
