import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createIsolatedStore, QA_RESELLER_IDS, QA_USERS } from "../../lib/admin/qa/isolated-store.ts";
import { compiledV19Profile, previewPresentation, validatePresentationProfile } from "../../lib/admin/presentation.ts";
import {
  BACKEND_MANIFEST_READ,
  CONTRACT_ACTIVATION,
  CURRENT_CONTRACT_PATHS,
  DOCUMENTED_UNIMPLEMENTED,
  LEGACY_DOCUMENTED_PATHS,
  MEMBERSHIP_ADMIN_ROUTES,
  OPERATOR_MEMO_PERSIST,
  PRICE_CONFIRMATION_MEMO_LIVE_COLUMN,
  PRODUCT_GET_BY_ID_EXISTS,
  PRODUCT_LIST_GET_EXISTS,
  PRODUCT_REVISION_CONFLICT_IN_CORE,
  RESELLER_ID_LIVE_HTTP,
  RESELLER_ID_LIVE_POSTGRES_VERIFIED,
} from "../../lib/admin/contract.ts";
import { persistBodyFromDraft, validateOperatorProductDraft } from "../../lib/admin/product.ts";
import { assertScopedUserId } from "../../lib/admin/identity.ts";
import { mapHttpFailure } from "../../lib/admin/errors.ts";
import {
  isPayoutComplete,
  moneyDisplayLines,
  projectMoneyAuthority,
  readMoneyAuthority,
} from "../../lib/admin/money-authority.ts";
import { isDeniedUrl, isIsolatedAllowed, assertNoProdHost } from "./allowlist.mjs";
import { startCanary } from "./canary.mjs";

function pass(name: string) {
  console.log(`PASS ${name}`);
}

const store = createIsolatedStore();
store.setStoreReady(true);

const login = store.login("qa-super");
assert.equal(login.ok, true);
pass("isolated login");

const found = store.getMembership(QA_USERS.explicit8);
assert.equal(found.ok, true);
if (found.ok) {
  assert.equal(found.data.quota.cap, 8);
  assert.equal(found.data.quota.used, 2);
  assert.notEqual(found.data.quota.cap, 5);
}
pass("explicit 8 preserved");

const missing = store.getMembership(QA_USERS.missing);
assert.equal(missing.ok, false);
if (!missing.ok) assert.equal(missing.code, "NOT_FOUND");
pass("missing user is 404, no first-member fallback");

const badId = store.getMembership("PD-10284");
assert.equal(badId.ok, false);
pass("legacy demo id is not substituted");

store.setStoreReady(false);
const unready = store.putDailyMatchCap(QA_USERS.explicit8, {
  dailyUserMatchCap: 3,
  reason: "격리 시험 한도 변경 사유입니다",
});
assert.equal(unready.ok, false);
if (!unready.ok) {
  assert.equal(unready.code, "STORE_UNREADY");
  assert.equal(unready.applied, false);
}
store.setStoreReady(true);
pass("503 STORE_UNREADY is not success");

const cap0 = store.putDailyMatchCap(QA_USERS.cap0, {
  dailyUserMatchCap: 0,
  reason: "격리 시험 0회 차단 사유입니다",
});
assert.equal(cap0.ok, true);
const after0 = store.getMembership(QA_USERS.cap0);
assert.equal(after0.ok, true);
if (after0.ok) {
  assert.equal(after0.data.quota.explicitParticipateBlock, true);
  assert.equal(after0.data.quota.participateRemaining, 0);
}
const grantOnZero = store.grantBonus(QA_USERS.cap0, {
  amount: 2,
  reason: "격리 시험 추가 지급 사유입니다",
  idempotencyKey: "bonus-zero-1",
});
assert.equal(grantOnZero.ok, true);
const afterGrant = store.getMembership(QA_USERS.cap0);
assert.equal(afterGrant.ok, true);
if (afterGrant.ok) {
  assert.equal(afterGrant.data.quota.explicitParticipateBlock, true);
  assert.equal(afterGrant.data.quota.participateRemaining, 0);
}
pass("bonus does not lift explicit 0");

const replay = store.grantBonus(QA_USERS.cap0, {
  amount: 2,
  reason: "격리 시험 추가 지급 사유입니다",
  idempotencyKey: "bonus-zero-1",
});
assert.equal(replay.ok, true);
if (replay.ok) assert.equal(replay.data.replay, true);
pass("same idempotency key replays");

store.login("qa-cs");
const denied = store.putDailyMatchCap(QA_USERS.explicit8, {
  dailyUserMatchCap: 4,
  reason: "상담 계정은 쓰면 안 되는 변경입니다",
});
assert.equal(denied.ok, false);
if (!denied.ok) assert.equal(denied.code, "ADMIN_CAPABILITY_DENIED");
pass("cs cannot write cap");

store.login("qa-super");
const firstGrade = store.listGradeDailyCaps();
assert.equal(firstGrade.ok, true);
if (firstGrade.ok) {
  const conflict = store.putGradeDailyCap({
    grade: "sprout",
    dailyUserMatchCap: 4,
    reason: "격리 시험 등급 한도 변경 사유",
    expectedRevision: firstGrade.data.revision - 1,
  });
  assert.equal(conflict.ok, false);
  if (!conflict.ok) assert.equal(conflict.code, "REVISION_CONFLICT");
}
pass("409 revision conflict");

const listed = store.listPresentation();
assert.equal(listed.ok, true);
const fiveStep = validatePresentationProfile({
  steps: ["product_check", "price_compare", "matching", "settle_prep", "credit"],
  totalDurationSec: 14,
});
assert.equal(fiveStep.ok, false);
const withAt = validatePresentationProfile({
  phases: compiledV19Profile().phases.map((p) => ({ ...p, at: p.atSec })),
  totalDurationSec: 70,
});
assert.equal(withAt.ok, false);
const preview = previewPresentation(compiledV19Profile());
assert.equal(preview.ok, true);
if (preview.ok) {
  assert.equal(preview.data.previewOnly, true);
  assert.equal(preview.data.participateCreated, false);
}
const saved = store.putPresentation({
  profile: compiledV19Profile(),
  reason: "격리 시험 화면 진행 시간 저장",
  expectedRevision: listed.ok ? listed.data.revision : 0,
});
assert.equal(saved.ok, true);
if (saved.ok) {
  assert.equal(saved.data.applied, true);
  assert.equal(saved.data.moneyUntouched, true);
  assert.equal(saved.data.capUntouched, true);
}
pass("presentation validate + save");

assert.equal(DOCUMENTED_UNIMPLEMENTED.adminUsersList.includes("/admin/users"), true);
assert.equal(LEGACY_DOCUMENTED_PATHS.adminAuthLogin.includes("admin-auth/login"), true);
assert.equal(CURRENT_CONTRACT_PATHS.adminSessionLogin.includes("admin-session/login"), true);
assert.equal(CONTRACT_ACTIVATION.adminSessionLogin, "BLOCKED");
assert.equal(CURRENT_CONTRACT_PATHS.adminUsersUuidLookup.includes("/admin/users?q="), true);
assert.equal(CONTRACT_ACTIVATION.adminUsersPaginatedList, "BLOCKED");
assert.equal(MEMBERSHIP_ADMIN_ROUTES.membership("x").includes("/me/membership"), false);
pass("me/membership is not used as admin list");

const unreadyStore = createIsolatedStore();
unreadyStore.login("qa-super");
const unreadySnap = unreadyStore.getMembership(QA_USERS.explicit8);
assert.equal(unreadySnap.ok, true);
if (unreadySnap.ok) {
  assert.equal(unreadySnap.data.quota.bonusRemaining, undefined);
  assert.equal(unreadySnap.data.quota.storeStatus, "unready");
}
const emptyQ = unreadyStore.lookupUser("");
assert.equal(emptyQ.ok, false);
const missingLookup = unreadyStore.lookupUser(QA_USERS.missing);
assert.equal(missingLookup.ok, false);
if (!missingLookup.ok) assert.equal(missingLookup.code, "NOT_FOUND");
const exactLookup = unreadyStore.lookupUser(QA_USERS.explicit8);
assert.equal(exactLookup.ok, true);
if (exactLookup.ok) {
  assert.equal(exactLookup.data.userId, QA_USERS.explicit8);
  assert.equal(exactLookup.data.substituted, false);
}
const badProduct = validateOperatorProductDraft({
  name: "",
  description: "",
  photos: [],
  compositionQty: 0,
  payoutAmount: "x",
  visibility: "all_public",
  selectedMemberIds: [],
});
assert.equal(badProduct.ok, false);
const previewOk = unreadyStore.previewProduct({
  name: "격리 시험 상품",
  description: "",
  photos: [],
  compositionQty: 2,
  payoutAmount: "12.5",
  currency: "USDT",
  visibility: "all_public",
  selectedMemberIds: [],
});
assert.equal(previewOk.ok, true);
const persistBlocked = unreadyStore.registerProduct({
  name: "격리 시험 상품",
  description: "",
  photos: [],
  compositionQty: 2,
  payoutAmount: "12.5",
  currency: "USDT",
  visibility: "all_public",
  selectedMemberIds: [],
});
assert.equal(persistBlocked.ok, false);
if (!persistBlocked.ok) {
  assert.equal(persistBlocked.code, "STORE_UNREADY");
  assert.equal(persistBlocked.applied, false);
}
pass("uuid lookup + unready bonus unknown + product persist blocked");

const expectedOnly = projectMoneyAuthority({ expectedProfitUsdt: "12.5" });
assert.equal(expectedOnly.payoutAuthoritative, false);
assert.equal(isPayoutComplete(expectedOnly), false);
const configuredOnly = projectMoneyAuthority({ configuredPayoutUsdt: "10" });
assert.equal(configuredOnly.ledgerPaidUsdt, null);
assert.equal(isPayoutComplete(configuredOnly), false);
const noJournal = projectMoneyAuthority({
  expectedProfitUsdt: "12.5",
  ledgerPaidUsdt: "12.5",
});
assert.equal(noJournal.ledgerPaidUsdt, null);
assert.equal(isPayoutComplete(noJournal), false);
const paid = projectMoneyAuthority({
  expectedProfitUsdt: "12.5",
  configuredPayoutUsdt: "10",
  ledgerPaidUsdt: "10",
  ledgerJournalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
});
assert.equal(isPayoutComplete(paid), true);
assert.notEqual(paid.expectedProfitUsdt, paid.ledgerPaidUsdt);
const clientClaim = projectMoneyAuthority({
  ledgerPaidUsdt: "99",
  ledgerJournalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  clientComputedUsdt: "99",
});
assert.equal(isPayoutComplete(clientClaim), false);
const missingAuth = readMoneyAuthority({});
assert.equal(isPayoutComplete(missingAuth), false);
const claimedWithoutJournal = readMoneyAuthority({
  payoutAuthoritative: true,
  ledgerPaidUsdt: "12.5",
});
assert.equal(isPayoutComplete(claimedWithoutJournal), false);
assert.equal(moneyDisplayLines(null).some((line) => line.includes("지급 완료 아님")), true);
assert.equal(OPERATOR_MEMO_PERSIST, false);
assert.equal(PRICE_CONFIRMATION_MEMO_LIVE_COLUMN, false);
assert.equal(RESELLER_ID_LIVE_HTTP, true);
assert.equal(RESELLER_ID_LIVE_POSTGRES_VERIFIED, false);
pass("money authority expected/configured/paid/no-journal");

const stale = assertScopedUserId(QA_USERS.cap0, QA_USERS.explicit8);
assert.equal(stale.ok, false);
if (!stale.ok) assert.equal(stale.code, "USER_MISMATCH");
const missingUserIdOk = assertScopedUserId(null, QA_USERS.explicit8);
assert.equal(missingUserIdOk.ok, true);
const sameUser = assertScopedUserId(QA_USERS.explicit8, QA_USERS.explicit8);
assert.equal(sameUser.ok, true);
const grades = store.listGradeDailyCaps();
assert.equal(grades.ok, true);
if (grades.ok) assert.equal("userId" in grades.data, false);
pass("stale member userId rejected; shared dto does not require userId");

const selected = validateOperatorProductDraft({
  name: "선택 공개 시험",
  description: "",
  photos: [],
  compositionQty: 1,
  payoutAmount: "3.5",
  visibility: "selected_members",
  selectedMemberIds: [QA_USERS.explicit8, QA_USERS.signup5],
});
assert.equal(selected.ok, true);
if (selected.ok) {
  const persist = persistBodyFromDraft(selected.data);
  assert.equal(persist.visibility, "selected_members");
  assert.equal(persist.selectedMemberIds.length, 2);
  assert.equal(persist.priceConfirmationMemo, "");
  assert.equal("operatorMemo" in persist, false);
}
const withMemo = validateOperatorProductDraft({
  name: "메모 포함",
  description: "",
  photos: [],
  compositionQty: 1,
  payoutAmount: "1.5",
  visibility: "all_public",
  selectedMemberIds: [],
  priceConfirmationMemo: "확인: 1.5 USDT",
});
assert.equal(withMemo.ok, true);
if (withMemo.ok) {
  assert.equal(persistBodyFromDraft(withMemo.data).priceConfirmationMemo, "확인: 1.5 USDT");
}
const readyStore = createIsolatedStore();
readyStore.login("qa-super");
readyStore.setStoreReady(true);
const created = readyStore.registerProduct({
  name: "격리 준비 상품",
  description: "",
  photos: [],
  compositionQty: 1,
  payoutAmount: "12.5",
  currency: "USDT",
  visibility: "all_public",
  selectedMemberIds: [],
});
assert.equal(created.ok, true);
if (created.ok) {
  assert.equal(created.data.applied, true);
  assert.equal(created.data.product.moneyAuthority?.payoutAuthoritative, false);
  assert.equal(created.data.product.moneyAuthority?.configuredPayoutUsdt, "12.5");
  assert.equal(created.data.product.moneyAuthority?.ledgerPaidUsdt, null);
}
pass("selected visibility + persist excludes memo + ready product not paid");

assert.equal(isDeniedUrl(new URL("https://api.hiptk.app/api/v1/admin/users")), true);
assert.equal(isIsolatedAllowed(new URL("http://127.0.0.1:4177/health")), true);
assert.throws(() => assertNoProdHost(new URL("https://api.hiptk.app/health")));
pass("network allowlist blocks prod host");

const canary = startCanary(path.join(path.dirname(fileURLToPath(import.meta.url)), ".tmp-canary.json"));
await canary.listen(4178);
const hit = await fetch("http://127.0.0.1:4178/probe");
assert.equal(hit.ok, true);
assert.equal(canary.hits.length, 1);
await canary.close();
pass("local canary only");

const unreadyAuth = createIsolatedStore();
const loggedUnready = unreadyAuth.login("qa-super");
assert.equal(loggedUnready.ok, true);
const lookedUnready = unreadyAuth.lookupUser(QA_USERS.explicit8);
assert.equal(lookedUnready.ok, true);
if (lookedUnready.ok) {
  assert.equal(lookedUnready.data.resellerId, QA_RESELLER_IDS.explicit8);
}
const blockedCap = unreadyAuth.putDailyMatchCap(QA_USERS.explicit8, {
  dailyUserMatchCap: 3,
  reason: "준비 전 쓰기는 막혀야 하는 사유입니다",
});
assert.equal(blockedCap.ok, false);
if (!blockedCap.ok) assert.equal(blockedCap.code, "STORE_UNREADY");
const readStillWorks = unreadyAuth.getMembership(QA_USERS.explicit8);
assert.equal(readStillWorks.ok, true);
unreadyAuth.logout();
const afterLogout = unreadyAuth.getMembership(QA_USERS.explicit8);
assert.equal(afterLogout.ok, false);
if (!afterLogout.ok) assert.equal(afterLogout.code, "ADMIN_AUTH_REQUIRED");
pass("unready login/lookup allowed; write blocked; session expiry 401");

const csrf = mapHttpFailure(401, { code: "ADMIN_CSRF_INVALID" });
assert.equal(csrf.ok, false);
if (!csrf.ok) assert.equal(csrf.code, "ADMIN_CSRF_INVALID");
const expired = mapHttpFailure(401, { code: "ADMIN_AUTH_INVALID" });
assert.equal(expired.ok, false);
if (!expired.ok) assert.equal(expired.code, "ADMIN_AUTH_INVALID");
const deniedHttp = mapHttpFailure(403, { code: "ADMIN_CAPABILITY_DENIED" });
assert.equal(deniedHttp.ok, false);
if (!deniedHttp.ok) assert.equal(deniedHttp.code, "ADMIN_CAPABILITY_DENIED");
const notFoundHttp = mapHttpFailure(404, { message: "user not found" });
assert.equal(notFoundHttp.ok, false);
if (!notFoundHttp.ok) {
  assert.equal(notFoundHttp.code, "NOT_FOUND");
  assert.equal(notFoundHttp.message.includes("회원 번호"), false);
}
const conflictHttp = mapHttpFailure(409, { code: "REVISION_CONFLICT" });
assert.equal(conflictHttp.ok, false);
if (!conflictHttp.ok) assert.equal(conflictHttp.code, "REVISION_CONFLICT");
const storeHttp = mapHttpFailure(503, { code: "STORE_UNREADY", applied: false });
assert.equal(storeHttp.ok, false);
if (!storeHttp.ok) {
  assert.equal(storeHttp.code, "STORE_UNREADY");
  assert.equal(storeHttp.applied, false);
}
const netHttp = mapHttpFailure(0, {});
assert.equal(netHttp.ok, false);
if (!netHttp.ok) assert.equal(netHttp.code, "CONNECTION_WAITING");
pass("http 401/403/404/409/503/network mapped without fake success");

assert.equal(PRODUCT_LIST_GET_EXISTS, false);
assert.equal(PRODUCT_GET_BY_ID_EXISTS, false);
assert.equal(PRODUCT_REVISION_CONFLICT_IN_CORE, false);
assert.equal(BACKEND_MANIFEST_READ.gitHead !== BACKEND_MANIFEST_READ.manifestEmbeddedHead, true);
assert.notEqual(BACKEND_MANIFEST_READ.gitHead, "ec436d4d32937f2778b4b764e89918de2ca70280");
pass("read contract versions recorded, fingerprints not forced");

const issued = readyStore.getMembership(QA_USERS.explicit8);
assert.equal(issued.ok, true);
if (issued.ok) assert.equal(issued.data.resellerId, QA_RESELLER_IDS.explicit8);
const unissued = readyStore.getMembership(QA_USERS.cap0);
assert.equal(unissued.ok, true);
if (unissued.ok) assert.equal(unissued.data.resellerId == null, true);
pass("server resellerId or clear unissued");

assert.equal(created.ok, true);
if (created.ok) {
  const missingList = readyStore.listParticipations("55555555-5555-4555-8555-555555555555");
  assert.equal(missingList.ok, false);
  if (!missingList.ok) assert.equal(missingList.code, "NOT_FOUND");
  const missingProduct = readyStore.updateProduct("55555555-5555-4555-8555-555555555555", {
    name: "없는 상품",
    description: "",
    photos: [],
    compositionQty: 1,
    payoutAmount: "1",
    currency: "USDT",
    visibility: "all_public",
    selectedMemberIds: [],
    priceConfirmationMemo: "",
  });
  assert.equal(missingProduct.ok, false);
  if (!missingProduct.ok) assert.equal(missingProduct.code, "NOT_FOUND");
  const staleRev = readyStore.updateProduct(created.data.product.id, {
    name: "버전 어긋남",
    description: "",
    photos: [],
    compositionQty: 1,
    payoutAmount: "12.5",
    currency: "USDT",
    visibility: "all_public",
    selectedMemberIds: [],
    priceConfirmationMemo: "확인: 12.5 USDT",
    expectedRevision: created.data.product.revision - 1,
  });
  assert.equal(staleRev.ok, false);
  if (!staleRev.ok) assert.equal(staleRev.code, "REVISION_CONFLICT");
  const memoKeep = readyStore.updateProduct(created.data.product.id, {
    name: "메모 유지 상품",
    description: "",
    photos: [],
    compositionQty: 1,
    payoutAmount: "12.5",
    currency: "USDT",
    visibility: "selected_members",
    selectedMemberIds: [QA_USERS.explicit8],
    priceConfirmationMemo: "확인: 12.5 USDT",
    expectedRevision: created.data.product.revision,
  });
  assert.equal(memoKeep.ok, true);
  if (memoKeep.ok) {
    assert.equal(memoKeep.data.product.priceConfirmationMemo, "확인: 12.5 USDT");
    assert.equal(memoKeep.data.product.visibility, "selected_members");
    assert.equal(isPayoutComplete(memoKeep.data.product.moneyAuthority ?? null), false);
  }
  readyStore.seedParticipation({
    id: "66666666-6666-4666-8666-666666666666",
    userId: QA_USERS.explicit8,
    productId: created.data.product.id,
    snapshot: { payoutAmount: "12.5", visibility: "all_public", productRevision: 1 },
    moneyAuthority: projectMoneyAuthority({ configuredPayoutUsdt: "12.5" }),
  });
  const listedParts = readyStore.listParticipations(created.data.product.id);
  assert.equal(listedParts.ok, true);
  if (listedParts.ok) {
    assert.equal(listedParts.data.items.length, 1);
    assert.equal(isPayoutComplete(listedParts.data.items[0]?.moneyAuthority ?? null), false);
    assert.equal(listedParts.data.items[0]?.snapshot?.payoutAmount, "12.5");
  }
  const unreadyProduct = createIsolatedStore();
  unreadyProduct.login("qa-super");
  const product503 = unreadyProduct.updateProduct(created.data.product.id, {
    name: "준비 전 수정",
    description: "",
    photos: [],
    compositionQty: 1,
    payoutAmount: "1",
    currency: "USDT",
    visibility: "all_public",
    selectedMemberIds: [],
    priceConfirmationMemo: "",
  });
  assert.equal(product503.ok, false);
  if (!product503.ok) assert.equal(product503.code, "STORE_UNREADY");
}
pass("product 404/409/503 + memo visibility + snapshot not paid");

const grantOnce = readyStore.grantBonus(QA_USERS.signup5, {
  amount: 1,
  reason: "응답 유실 후 같은 키 재시도 사유입니다",
  idempotencyKey: "bonus-lost-retry",
});
assert.equal(grantOnce.ok, true);
const grantRetry = readyStore.grantBonus(QA_USERS.signup5, {
  amount: 1,
  reason: "응답 유실 후 같은 키 재시도 사유입니다",
  idempotencyKey: "bonus-lost-retry",
});
assert.equal(grantRetry.ok, true);
if (grantRetry.ok) assert.equal(grantRetry.data.replay, true);
pass("lost response retries same idempotency key");

console.log("isolated-admin-flow PASS 23");
