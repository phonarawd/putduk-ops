import {
  GRADE_DAILY_MATCH_DEFAULTS,
  MEMBERSHIP_LABEL_KO,
  NEW_SIGNUP_DAILY_MATCH_CAP,
  OBSERVED_LADDER_SPROUT,
  isMembershipId,
  isUuid,
  REASON_MIN_LENGTH,
  type CmsKind,
  type MembershipId,
  type ProductVisibility,
} from "../contract.ts";
import { failure, type AdminResult } from "../errors.ts";
import {
  compiledUnreadyListing,
  compiledV19Profile,
  listingFlags,
  validatePresentationProfile,
  type PresentationListing,
} from "../presentation.ts";
import { moneyFromConfiguredPayout } from "../money-authority.ts";
import {
  persistBodyFromDraft,
  validateOperatorProductDraft,
  type OperatorProduct,
  type OperatorProductDraft,
} from "../product.ts";
import type {
  AdminSession,
  BonusGrant,
  BonusList,
  CmsPost,
  DailyMatchQuota,
  DepositConfigPatchBody,
  DepositConfigView,
  DirectoryLookup,
  GradeControl,
  GradeDailyCaps,
  KycQueueItem,
  KrwDepositItem,
  MemberDepositAddress,
  MemberListItem,
  MemberProfile,
  MembershipSnapshot,
  ParticipationRow,
  ProductUpdateDraft,
  WithdrawIntentItem,
  WriteMeta,
} from "../types.ts";

export const QA_USERS = {
  explicit8: "11111111-1111-4111-8111-111111111111",
  cap0: "22222222-2222-4222-8222-222222222222",
  missing: "33333333-3333-4333-8333-333333333333",
  signup5: "44444444-4444-4444-8444-444444444444",
} as const;

/** 격리 시험용 서버 필드. 계정 이름 대체가 아님. cap0은 미발급. */
export const QA_RESELLER_IDS = {
  explicit8: "QAEXPL81",
  signup5: "QASIGN05",
} as const;

const QA_ADMIN = {
  "qa-super": { adminId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", role: "super", displayName: "격리 최고관리" },
  "qa-finance": { adminId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", role: "finance", displayName: "격리 재무" },
  "qa-cs": { adminId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", role: "cs", displayName: "격리 상담" },
  "qa-marketing": { adminId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", role: "marketing", displayName: "격리 마케팅" },
} as const;

type UserRow = {
  userId: string;
  membership: MembershipId;
  dailyUserMatchCap: number;
  dailyMatchesUsed: number;
  matchStrictness: string;
  adminForce: boolean;
  overrideCap: number | null;
  frozen: boolean;
  resellerId?: string;
};

function emptyBonus(): BonusList["remaining"] {
  return { granted: 0, used: 0, reclaimed: 0, remaining: 0, grants: [] };
}

export function createIsolatedStore() {
  const SESSION_KEY = "putduk_ops_isolated_session";

  function readSavedSession(): AdminSession {
    if (typeof sessionStorage === "undefined") return { connected: false, mode: "isolated-qa" };
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { connected: false, mode: "isolated-qa" };
    try {
      const parsed = JSON.parse(raw) as AdminSession;
      if (parsed.connected === true && parsed.adminId && parsed.role) {
        return { ...parsed, mode: "isolated-qa" };
      }
    } catch {
      /* 시험 세션만 복원 */
    }
    return { connected: false, mode: "isolated-qa" };
  }

  function writeSavedSession(next: AdminSession) {
    if (typeof sessionStorage === "undefined") return;
    if (next.connected) sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(SESSION_KEY);
  }

  const cmsPosts: CmsPost[] = [];
  let depositConfig: DepositConfigView | null = null;
  const krwDeposits: KrwDepositItem[] = [];
  const withdrawIntents: WithdrawIntentItem[] = [];
  const kycQueue: KycQueueItem[] = [];
  let schemaReady = false;
  let presentationReady = false;
  let writeDelayMs = 0;
  let session: AdminSession = readSavedSession();
  let gradeRevision = 1;
  const gradeCaps: Record<MembershipId, number> = { ...GRADE_DAILY_MATCH_DEFAULTS };
  const users = new Map<string, UserRow>([
    [
      QA_USERS.explicit8,
      {
        userId: QA_USERS.explicit8,
        membership: "sprout",
        dailyUserMatchCap: OBSERVED_LADDER_SPROUT,
        dailyMatchesUsed: 2,
        matchStrictness: "lenient",
        adminForce: false,
        overrideCap: null,
        frozen: false,
        resellerId: QA_RESELLER_IDS.explicit8,
      },
    ],
    [
      QA_USERS.cap0,
      {
        userId: QA_USERS.cap0,
        membership: "high",
        dailyUserMatchCap: 0,
        dailyMatchesUsed: 0,
        matchStrictness: "tight",
        adminForce: true,
        overrideCap: 0,
        frozen: true,
        },
    ],
    [
      QA_USERS.signup5,
      {
        userId: QA_USERS.signup5,
        membership: "sprout",
        dailyUserMatchCap: NEW_SIGNUP_DAILY_MATCH_CAP,
        dailyMatchesUsed: 0,
        matchStrictness: "lenient",
        adminForce: false,
        overrideCap: null,
        frozen: false,
        resellerId: QA_RESELLER_IDS.signup5,
      },
    ],
  ]);
  const products = new Map<string, OperatorProduct>();
  const participations = new Map<string, ParticipationRow[]>();
  const grants = new Map<string, BonusGrant[]>();
  const idempotency = new Map<string, BonusGrant>();
  let presentation = compiledUnreadyListing();
  const history: Array<{ at: string; action: string; target: string; detail: string }> = [];

  function note(action: string, target: string, detail: string) {
    history.push({ at: new Date().toISOString(), action, target, detail });
  }

  function needUser(userId: string): AdminResult<UserRow> {
    if (!isUuid(userId)) return failure(400, "INVALID_INPUT", "회원 번호는 정확한 회원 식별 값이어야 해요.");
    const row = users.get(userId);
    if (!row) return failure(404, "NOT_FOUND", "이 회원 번호는 찾을 수 없어요. 다른 회원으로 바꾸지 않았어요.");
    return { ok: true, status: 200, data: row };
  }

  function needReason(reason: string): AdminResult<true> {
    if (reason.trim().length < REASON_MIN_LENGTH) {
      return failure(400, "INVALID_INPUT", "변경 이유는 10자 이상 적어 주세요.");
    }
    return { ok: true, status: 200, data: true };
  }

  function needSession(): AdminResult<AdminSession> {
    if (!session.connected || !session.adminId || !session.role) {
      return failure(401, "ADMIN_AUTH_REQUIRED", "운영자 로그인이 필요해요.");
    }
    return { ok: true, status: 200, data: session };
  }

  function needWrite(capability: "userMatchPolicy" | "userMembershipForce"): AdminResult<AdminSession> {
    const auth = needSession();
    if (!auth.ok) return auth;
    const role = auth.data.role;
    if (role === "super" || role === "finance") return auth;
    if (capability === "userMatchPolicy" && (role === "cs")) {
      return failure(403, "ADMIN_CAPABILITY_DENIED", "이 작업 권한이 없어요. 서버가 거절했습니다.");
    }
    return failure(403, "ADMIN_CAPABILITY_DENIED", "이 작업 권한이 없어요. 서버가 거절했습니다.");
  }

  function needRead(): AdminResult<AdminSession> {
    const auth = needSession();
    if (!auth.ok) return auth;
    const role = auth.data.role;
    if (role === "super" || role === "finance" || role === "cs") return auth;
    return failure(403, "ADMIN_CAPABILITY_DENIED", "이 작업 권한이 없어요. 서버가 거절했습니다.");
  }

  function quotaOf(row: UserRow): DailyMatchQuota {
    const cap = row.overrideCap != null ? row.overrideCap : row.dailyUserMatchCap;
    const used = row.dailyMatchesUsed;
    const baseRemaining = Math.max(0, cap - used);
    const bonus = projectBonus(row.userId);
    const explicitParticipateBlock = cap === 0;
    const participateRemaining = explicitParticipateBlock || row.frozen ? 0 : baseRemaining + bonus.remaining;
    return {
      userId: row.userId,
      cap,
      used,
      remaining: participateRemaining,
      source: row.overrideCap != null ? "user_override" : "membership_row",
      blocked: participateRemaining <= 0,
      usedCountBasis: "accepted_participate_requests_kst_day",
      timezone: "Asia/Seoul",
      baseRemaining,
      bonusRemaining: schemaReady ? bonus.remaining : undefined,
      participateRemaining,
      explicitParticipateBlock,
      storeStatus: schemaReady ? "ready" : "unready",
      schemaReady,
      persistence: schemaReady ? "runtime_persist" : "schema_unready",
      bonusSource: schemaReady ? "runtime_persist" : "store_unready",
      gradeCapSource: "grade_policy",
    };
  }

  function snapshot(row: UserRow): MembershipSnapshot {
    return {
      membership: {
        userId: row.userId,
        membership: row.membership,
        maxCapitalBand: "micro",
        dailyUserMatchCap: row.overrideCap != null ? row.overrideCap : row.dailyUserMatchCap,
        matchStrictness: row.matchStrictness,
        adminForce: row.adminForce,
        dailyMatchesUsed: row.dailyMatchesUsed,
      },
      labelKo: MEMBERSHIP_LABEL_KO[row.membership],
      quota: quotaOf(row),
      gradeControl: row.adminForce ? "MANUAL_PIN" : "AUTO",
      autoDowngrade: false,
      fulfillRateReadOnly: true,
      ledgerMutated: false,
      ...(row.resellerId ? { resellerId: row.resellerId } : {}),
    };
  }

  function projectBonus(userId: string): BonusList["remaining"] {
    const list = grants.get(userId) ?? [];
    let granted = 0;
    let used = 0;
    let reclaimed = 0;
    for (const g of list) {
      granted += g.amount;
      used += g.used;
      reclaimed += g.reclaimed;
    }
    return {
      granted,
      used,
      reclaimed,
      remaining: Math.max(0, granted - used - reclaimed),
      grants: list,
    };
  }

  function writeMeta(extra: Partial<WriteMeta> = {}): WriteMeta {
    return {
      applied: extra.applied === true && schemaReady,
      storeStatus: schemaReady ? "ready" : "unready",
      schemaReady,
      persistence: schemaReady ? "runtime_persist" : "schema_unready",
      replay: extra.replay === true,
      ledgerMutated: false,
      auditAction: extra.auditAction,
      revision: extra.revision,
    };
  }

  return {
    history,
    getSession(): AdminSession {
      return { ...session };
    },
    login(username: string): AdminResult<AdminSession> {
      const key = username.trim().toLowerCase() as keyof typeof QA_ADMIN;
      const found = QA_ADMIN[key];
      if (!found) return failure(401, "ADMIN_AUTH_INVALID", "격리 시험 계정이 아니에요.");
      session = { connected: true, mode: "isolated-qa", ...found };
      writeSavedSession(session);
      return { ok: true, status: 200, data: { ...session } };
    },
    logout(): AdminResult<{ connected: false }> {
      session = { connected: false, mode: "isolated-qa" };
      writeSavedSession(session);
      return { ok: true, status: 200, data: { connected: false } };
    },
    setStoreReady(ready: boolean) {
      schemaReady = ready;
      presentationReady = ready;
      if (!ready) presentation = compiledUnreadyListing();
    },
    setWriteDelay(ms: number) {
      writeDelayMs = Number.isFinite(ms) && ms > 0 ? Math.min(ms, 10_000) : 0;
    },
    async waitIfDelayed() {
      if (writeDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, writeDelayMs));
      }
    },
    lookupUser(userId: string): AdminResult<DirectoryLookup> {
      const auth = needRead();
      if (!auth.ok) return auth;
      const user = needUser(userId);
      if (!user.ok) return user;
      return {
        ok: true,
        status: 200,
        data: {
          userId: user.data.userId,
          membership: user.data.membership,
          exact: true,
          substituted: false,
          ...(user.data.resellerId ? { resellerId: user.data.resellerId } : {}),
        },
      };
    },
    listUsers(_cursor?: string): AdminResult<{ items: MemberListItem[]; nextCursor: string | null }> {
      const auth = needRead();
      if (!auth.ok) return auth;
      const items: MemberListItem[] = [];
      for (const row of users.values()) {
        items.push({
          userId: row.userId,
          createdAt: "2026-09-16T00:00:00.000Z",
          username: MEMBERSHIP_LABEL_KO[row.membership],
          status: row.frozen ? "frozen" : "active",
          emailMasked: null,
          phoneMasked: null,
          resellerId: row.resellerId ?? null,
          membership: row.membership,
          signupIp: null,
        });
      }
      return { ok: true, status: 200, data: { items, nextCursor: null } };
    },
    getUserProfile(userId: string): AdminResult<{ item: MemberProfile }> {
      const listed = this.listUsers();
      if (!listed.ok) return listed;
      const found = listed.data.items.find((row) => row.userId === userId);
      if (!found) return failure(404, "NOT_FOUND", "이 회원 번호는 찾을 수 없어요. 다른 회원으로 바꾸지 않았어요.");
      return {
        ok: true,
        status: 200,
        data: {
          item: {
            ...found,
            profile: { displayName: found.username, declaredName: null, onboardingStage: null, birthDate: null },
          },
        },
      };
    },
    getUserDepositAddress(userId: string): AdminResult<MemberDepositAddress> {
      const auth = needRead();
      if (!auth.ok) return auth;
      const user = needUser(userId);
      if (!user.ok) return user;
      return failure(404, "NOT_FOUND", "연습 화면에는 실제 입금 주소가 없어요. 공유 주소를 만들지 않았어요.");
    },
    getDepositConfig(): AdminResult<DepositConfigView> {
      const auth = needRead();
      if (!auth.ok) return auth;
      if (!depositConfig) {
        return failure(
          503,
          "CONFIG_NOT_READY",
          "입금 안내가 아직 저장되지 않았어요. 은행 정보는 직접 적어야 하고, 가짜 계좌를 넣지 않아요.",
        );
      }
      return { ok: true, status: 200, data: depositConfig };
    },
    patchDepositConfig(body: DepositConfigPatchBody): AdminResult<DepositConfigView> {
      const auth = needWrite("userMatchPolicy");
      if (!auth.ok) return auth;
      const reason = needReason(body.changeReason);
      if (!reason.ok) return reason;
      if (!schemaReady) {
        return failure(503, "STORE_UNREADY", "저장소가 아직 준비되지 않아 적용하지 않았어요. 완료로 표시하지 않아요.");
      }
      const bank = String(body.krw?.bankName || "").trim();
      const account = String(body.krw?.accountNumber || "").trim();
      const holder = String(body.krw?.accountHolder || "").trim();
      if (!bank || !account || !holder) {
        return failure(400, "INVALID_INPUT", "은행 이름·계좌·예금주를 직접 적어 주세요. 비워 두면 저장하지 않아요.");
      }
      depositConfig = {
        configVersion: (depositConfig?.configVersion ?? 0) + 1,
        krw: {
          bankName: bank,
          accountNumber: account,
          accountHolder: holder,
          noticeKo: String(body.krw?.noticeKo || ""),
          krwWithdrawFeeKrw: Number(body.krw?.krwWithdrawFeeKrw || 0),
        },
        usdtOnchain: {
          network: "TRC20",
          tronGridBaseUrl: body.usdtOnchain.tronGridBaseUrl,
          hotWalletXpubRef: body.usdtOnchain.hotWalletXpubRef,
          treasuryHotAddressRef: body.usdtOnchain.treasuryHotAddressRef,
          energyDelegateEnabled: body.usdtOnchain.energyDelegateEnabled,
          usdtWithdrawNetworkFeeUsdt: body.usdtOnchain.usdtWithdrawNetworkFeeUsdt,
          minTrxStakeForSweeper: body.usdtOnchain.minTrxStakeForSweeper,
          sweeperPaused: body.usdtOnchain.sweeperPaused,
        },
        withdrawGuards: { minHoldingHours: body.withdrawGuards.minHoldingHours },
        pricingGuards: { priceStaleMaxSec: body.pricingGuards.priceStaleMaxSec, requireMinProfitUsdt: true },
        updatedAt: new Date().toISOString(),
      };
      return { ok: true, status: 200, data: depositConfig };
    },
    listKrwDeposits(_status?: string): AdminResult<{ items: KrwDepositItem[] }> {
      const auth = needRead();
      if (!auth.ok) return auth;
      return { ok: true, status: 200, data: { items: krwDeposits.slice() } };
    },
    decideKrwDeposit(_id?: string, _decision?: string, _body?: unknown): AdminResult<{ ok: true }> {
      return failure(404, "NOT_FOUND", "연습 화면에는 확인할 입금이 없어요.");
    },
    listWithdrawIntents(): AdminResult<{ items: WithdrawIntentItem[] }> {
      const auth = needRead();
      if (!auth.ok) return auth;
      return { ok: true, status: 200, data: { items: withdrawIntents.slice() } };
    },
    decideWithdraw(_id?: string, _decision?: string, _body?: unknown): AdminResult<{ ok: true }> {
      return failure(404, "NOT_FOUND", "연습 화면에는 확인할 출금이 없어요.");
    },
    listKyc(_status?: string): AdminResult<{ items: KycQueueItem[] }> {
      const auth = needRead();
      if (!auth.ok) return auth;
      return { ok: true, status: 200, data: { items: kycQueue.slice() } };
    },
    decideKyc(_userId?: string, _decision?: string, _body?: unknown): AdminResult<{ ok: true }> {
      return failure(404, "NOT_FOUND", "연습 화면에는 확인할 본인 확인이 없어요.");
    },
    listCms(kind: CmsKind): AdminResult<{ items: CmsPost[] }> {
      const auth = needRead();
      if (!auth.ok) return auth;
      return { ok: true, status: 200, data: { items: cmsPosts.filter((row) => row.kind === kind) } };
    },
    createCms(kind: CmsKind, body: { title: string; body: string; imageUrl?: string }): AdminResult<{ item: CmsPost }> {
      const auth = needWrite("userMatchPolicy");
      if (!auth.ok) return auth;
      const title = String(body.title || "").trim();
      if (!title) return failure(400, "INVALID_INPUT", "제목을 적어 주세요.");
      if (/토토|베팅|toto|betting/i.test(`${title}${body.body || ""}`)) {
        return failure(400, "INVALID_INPUT", "토토·베팅 문구는 저장하지 않아요.");
      }
      const now = new Date().toISOString();
      const item: CmsPost = {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `cms-${Date.now()}`,
        kind,
        status: "draft",
        title,
        body: String(body.body || ""),
        imageUrl: body.imageUrl?.trim() ? body.imageUrl.trim() : null,
        publishedAt: null,
        endedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      cmsPosts.unshift(item);
      return { ok: true, status: 201, data: { item } };
    },
    patchCms(kind: CmsKind, id: string, body: { title: string; body: string; imageUrl?: string }): AdminResult<{ item: CmsPost }> {
      const auth = needWrite("userMatchPolicy");
      if (!auth.ok) return auth;
      const found = cmsPosts.find((row) => row.id === id && row.kind === kind);
      if (!found) return failure(404, "NOT_FOUND", "찾을 수 없어요. 다른 대상으로 바꾸지 않았어요.");
      if (found.status !== "draft") return failure(409, "REVISION_CONFLICT", "초안만 고칠 수 있어요.");
      found.title = String(body.title || "").trim();
      found.body = String(body.body || "");
      found.imageUrl = body.imageUrl?.trim() ? body.imageUrl.trim() : null;
      found.updatedAt = new Date().toISOString();
      return { ok: true, status: 200, data: { item: found } };
    },
    publishCms(kind: CmsKind, id: string): AdminResult<{ item: CmsPost }> {
      const auth = needWrite("userMatchPolicy");
      if (!auth.ok) return auth;
      const found = cmsPosts.find((row) => row.id === id && row.kind === kind);
      if (!found) return failure(404, "NOT_FOUND", "찾을 수 없어요. 다른 대상으로 바꾸지 않았어요.");
      if (found.status !== "draft" && found.status !== "published") {
        return failure(409, "REVISION_CONFLICT", "초안만 게시할 수 있어요.");
      }
      const now = new Date().toISOString();
      found.status = "published";
      found.publishedAt = found.publishedAt ?? now;
      found.updatedAt = now;
      return { ok: true, status: 200, data: { item: found } };
    },
    endCms(kind: CmsKind, id: string): AdminResult<{ item: CmsPost }> {
      const auth = needWrite("userMatchPolicy");
      if (!auth.ok) return auth;
      const found = cmsPosts.find((row) => row.id === id && row.kind === kind);
      if (!found) return failure(404, "NOT_FOUND", "찾을 수 없어요. 다른 대상으로 바꾸지 않았어요.");
      if (found.status !== "published" && found.status !== "ended") {
        return failure(409, "REVISION_CONFLICT", "게시 중인 글만 종료할 수 있어요.");
      }
      const now = new Date().toISOString();
      found.status = "ended";
      found.endedAt = now;
      found.updatedAt = now;
      return { ok: true, status: 200, data: { item: found } };
    },
    getMembership(userId: string): AdminResult<MembershipSnapshot> {
      const auth = needRead();
      if (!auth.ok) return auth;
      const user = needUser(userId);
      if (!user.ok) return user;
      return { ok: true, status: 200, data: snapshot(user.data) };
    },
    putDailyMatchCap(
      userId: string,
      body: { dailyUserMatchCap?: number; clear?: boolean; reason: string },
    ): AdminResult<MembershipSnapshot & WriteMeta> {
      const auth = needWrite("userMatchPolicy");
      if (!auth.ok) return auth;
      const reason = needReason(body.reason);
      if (!reason.ok) return reason;
      const user = needUser(userId);
      if (!user.ok) return user;
      if (!schemaReady) return failure(503, "STORE_UNREADY", "저장소가 아직 준비되지 않아 적용하지 않았어요. 완료로 표시하지 않아요.");
      const row = user.data;
      const beforeStrictness = row.matchStrictness;
      if (body.clear === true) {
        row.overrideCap = null;
      } else if (body.dailyUserMatchCap != null) {
        if (!Number.isInteger(body.dailyUserMatchCap) || body.dailyUserMatchCap < 0) {
          return failure(400, "INVALID_INPUT", "하루 기본 기회는 0 이상 정수여야 해요.");
        }
        row.overrideCap = body.dailyUserMatchCap;
        if (body.dailyUserMatchCap === 0) row.dailyUserMatchCap = 0;
        else row.dailyUserMatchCap = body.dailyUserMatchCap;
      }
      row.matchStrictness = beforeStrictness;
      note("daily-match-cap", userId, `cap=${row.overrideCap ?? row.dailyUserMatchCap}`);
      return { ok: true, status: 200, data: { ...snapshot(row), ...writeMeta({ applied: true, auditAction: "admin.user.match_policy.updated" }) } };
    },
    forceMembership(
      userId: string,
      body: { membership?: MembershipId; clearForce?: boolean; reason: string },
    ): AdminResult<{ membership: MembershipSnapshot["membership"] } & WriteMeta> {
      const auth = needWrite("userMembershipForce");
      if (!auth.ok) return auth;
      const reason = needReason(body.reason);
      if (!reason.ok) return reason;
      const user = needUser(userId);
      if (!user.ok) return user;
      if (!schemaReady) return failure(503, "STORE_UNREADY", "저장소가 아직 준비되지 않아 적용하지 않았어요. 완료로 표시하지 않아요.");
      const row = user.data;
      const keptOverride = row.overrideCap;
      if (body.clearForce === true) {
        row.adminForce = false;
      } else {
        if (!body.membership || !isMembershipId(body.membership)) {
          return failure(400, "INVALID_INPUT", "등급 값이 올바르지 않아요.");
        }
        row.membership = body.membership;
        row.adminForce = true;
      }
      row.overrideCap = keptOverride;
      if (keptOverride != null) row.dailyUserMatchCap = keptOverride;
      note("membership-force", userId, `grade=${row.membership} pin=${row.adminForce}`);
      return {
        ok: true,
        status: 200,
        data: { membership: snapshot(row).membership, ...writeMeta({ applied: true, auditAction: "admin.user.membership.force" }) },
      };
    },
    listBonus(userId: string): AdminResult<BonusList> {
      const auth = needRead();
      if (!auth.ok) return auth;
      const user = needUser(userId);
      if (!user.ok) return user;
      if (!schemaReady) {
        return {
          ok: true,
          status: 200,
          data: {
            userId,
            grants: [],
            remaining: emptyBonus(),
            persistence: "schema_unready",
            schemaReady: false,
            storeStatus: "unready",
          },
        };
      }
      const remaining = projectBonus(userId);
      return {
        ok: true,
        status: 200,
        data: {
          userId,
          grants: remaining.grants,
          remaining,
          persistence: "runtime_persist",
          schemaReady: true,
          storeStatus: "ready",
        },
      };
    },
    grantBonus(
      userId: string,
      body: { amount: number; reason: string; idempotencyKey: string },
    ): AdminResult<{ grant: BonusGrant } & WriteMeta> {
      const auth = needWrite("userMatchPolicy");
      if (!auth.ok) return auth;
      const reason = needReason(body.reason);
      if (!reason.ok) return reason;
      const user = needUser(userId);
      if (!user.ok) return user;
      if (!schemaReady) return failure(503, "STORE_UNREADY", "저장소가 아직 준비되지 않아 적용하지 않았어요. 완료로 표시하지 않아요.");
      if (!Number.isInteger(body.amount) || body.amount < 1) {
        return failure(400, "INVALID_INPUT", "추가 기회는 1 이상 정수여야 해요.");
      }
      if (!body.idempotencyKey.trim()) {
        return failure(400, "INVALID_INPUT", "같은 요청을 구분하는 키가 필요해요.");
      }
      const existing = idempotency.get(body.idempotencyKey);
      if (existing) {
        return {
          ok: true,
          status: 200,
          data: { grant: existing, ...writeMeta({ applied: true, replay: true, auditAction: "admin.user.membership.bonus_grant" }) },
        };
      }
      const row = user.data;
      const grant: BonusGrant = {
        grantId: `bmg_qa_${idempotency.size + 1}`,
        userId,
        amount: body.amount,
        used: 0,
        reclaimed: 0,
        status: "active",
        reason: body.reason,
        updatedByAdminId: auth.data.adminId ?? "",
        idempotencyKey: body.idempotencyKey,
        at: new Date().toISOString(),
        expiresAt: null,
        expiryPolicy: "unspecified_not_activated",
        carryOver: false,
      };
      const list = grants.get(userId) ?? [];
      list.push(grant);
      grants.set(userId, list);
      idempotency.set(body.idempotencyKey, grant);
      if (row.overrideCap === 0) {
        row.overrideCap = 0;
        row.frozen = true;
      }
      note("bonus-grant", userId, `amount=${body.amount}`);
      return { ok: true, status: 200, data: { grant, ...writeMeta({ applied: true, auditAction: "admin.user.membership.bonus_grant" }) } };
    },
    reclaimBonus(
      userId: string,
      body: { amount?: number; reason: string },
    ): AdminResult<{ reclaimed: number; remaining: number } & WriteMeta> {
      const auth = needWrite("userMatchPolicy");
      if (!auth.ok) return auth;
      const reason = needReason(body.reason);
      if (!reason.ok) return reason;
      const user = needUser(userId);
      if (!user.ok) return user;
      if (!schemaReady) return failure(503, "STORE_UNREADY", "저장소가 아직 준비되지 않아 적용하지 않았어요. 완료로 표시하지 않아요.");
      const remainingBefore = projectBonus(userId).remaining;
      let left = body.amount == null ? remainingBefore : body.amount;
      if (!Number.isInteger(left) || left < 0) {
        return failure(400, "INVALID_INPUT", "회수 수량이 올바르지 않아요.");
      }
      left = Math.min(left, remainingBefore);
      let taken = 0;
      for (const g of grants.get(userId) ?? []) {
        const avail = g.amount - g.used - g.reclaimed;
        if (avail <= 0 || left <= 0) continue;
        const take = Math.min(avail, left);
        g.reclaimed += take;
        if (g.used + g.reclaimed >= g.amount) g.status = "reclaimed";
        taken += take;
        left -= take;
      }
      note("bonus-reclaim", userId, `reclaimed=${taken}`);
      return {
        ok: true,
        status: 200,
        data: {
          reclaimed: taken,
          remaining: projectBonus(userId).remaining,
          ...writeMeta({ applied: true, auditAction: "admin.user.membership.bonus_reclaim" }),
        },
      };
    },
    quotaProjection(userId: string): AdminResult<{ quota: DailyMatchQuota; gradeControl: GradeControl }> {
      const snap = this.getMembership(userId);
      if (!snap.ok) return snap;
      return {
        ok: true,
        status: 200,
        data: { quota: snap.data.quota, gradeControl: snap.data.gradeControl },
      };
    },
    listGradeDailyCaps(): AdminResult<GradeDailyCaps> {
      const auth = needRead();
      if (!auth.ok) return auth;
      return {
        ok: true,
        status: 200,
        data: {
          revision: gradeRevision,
          caps: { ...gradeCaps },
          compiledDefaults: { ...GRADE_DAILY_MATCH_DEFAULTS },
          existingMemberBackfill: false,
          storeStatus: schemaReady ? "ready" : "unready",
          schemaReady,
          persistence: schemaReady ? "runtime_persist" : "schema_unready",
        },
      };
    },
    putGradeDailyCap(body: {
      grade: MembershipId;
      dailyUserMatchCap: number;
      reason: string;
      expectedRevision?: number;
    }): AdminResult<GradeDailyCaps & WriteMeta> {
      const auth = needWrite("userMatchPolicy");
      if (!auth.ok) return auth;
      const reason = needReason(body.reason);
      if (!reason.ok) return reason;
      if (!schemaReady) return failure(503, "STORE_UNREADY", "저장소가 아직 준비되지 않아 적용하지 않았어요. 완료로 표시하지 않아요.");
      if (body.expectedRevision != null && body.expectedRevision !== gradeRevision) {
        return failure(409, "REVISION_CONFLICT", "다른 직원이 먼저 바꿔서 저장하지 않았어요. 다시 불러와 주세요.");
      }
      if (!isMembershipId(body.grade) || !Number.isInteger(body.dailyUserMatchCap) || body.dailyUserMatchCap < 0) {
        return failure(400, "INVALID_INPUT", "등급별 하루 기본 기회가 올바르지 않아요.");
      }
      gradeCaps[body.grade] = body.dailyUserMatchCap;
      gradeRevision += 1;
      note("grade-daily-cap", body.grade, `cap=${body.dailyUserMatchCap}`);
      const listed = this.listGradeDailyCaps();
      if (!listed.ok) return listed;
      return {
        ok: true,
        status: 200,
        data: { ...listed.data, ...writeMeta({ applied: true, revision: gradeRevision, auditAction: "admin.membership.grade_daily_cap.updated" }) },
      };
    },
    listPresentation(): AdminResult<PresentationListing> {
      const auth = needRead();
      if (!auth.ok) return auth;
      if (!presentationReady) return { ok: true, status: 200, data: compiledUnreadyListing() };
      return { ok: true, status: 200, data: presentation };
    },
    putPresentation(body: {
      profile: unknown;
      reason: string;
      expectedRevision?: number;
    }): AdminResult<PresentationListing & WriteMeta> {
      const auth = needWrite("userMatchPolicy");
      if (!auth.ok) return auth;
      const reason = needReason(body.reason);
      if (!reason.ok) return reason;
      const checked = validatePresentationProfile(body.profile);
      if (!checked.ok) return checked;
      if (!presentationReady || !schemaReady) {
        return failure(503, "STORE_UNREADY", "저장소가 아직 준비되지 않아 적용하지 않았어요. 완료로 표시하지 않아요.");
      }
      if (body.expectedRevision != null && body.expectedRevision !== presentation.revision) {
        return failure(409, "REVISION_CONFLICT", "다른 직원이 먼저 바꿔서 저장하지 않았어요. 다시 불러와 주세요.");
      }
      const nextRev = presentation.revision + 1;
      presentation = {
        ...checked.data,
        ...listingFlags({
          revision: nextRev,
          persistence: "runtime_persist",
          schemaReady: true,
          schemaApplied: true,
          storeStatus: "ready",
          operatorSecondsApplied: true,
          applied: true,
        }),
      };
      note("presentation", "global", `revision=${nextRev}`);
      return {
        ok: true,
        status: 200,
        data: { ...presentation, ...writeMeta({ applied: true, revision: nextRev, auditAction: "admin.membership.presentation_profile.updated" }) },
      };
    },
    restorePresentation(): PresentationListing {
      const profile = compiledV19Profile();
      return { ...profile, ...listingFlags({ revision: presentation.revision, persistence: presentation.persistence }) };
    },
    previewProduct(draft: OperatorProductDraft) {
      const checked = validateOperatorProductDraft(draft);
      if (!checked.ok) return checked;
      return { ok: true as const, status: 200, data: { persist: persistBodyFromDraft(checked.data) } };
    },
    listProducts() {
      const auth = needRead();
      if (!auth.ok) return auth;
      return {
        ok: true as const,
        status: 200,
        data: {
          items: [...products.values()],
          storeStatus: schemaReady ? ("ready" as const) : ("unready" as const),
        },
      };
    },
    getProduct(id: string) {
      const auth = needRead();
      if (!auth.ok) return auth;
      if (!isUuid(id)) return failure(400, "INVALID_INPUT", "상품 번호는 정확한 식별 값이어야 해요.");
      const product = products.get(id);
      if (!product) return failure(404, "NOT_FOUND", "찾을 수 없어요. 다른 대상으로 바꾸지 않았어요.");
      return { ok: true as const, status: 200, data: product };
    },
    registerProduct(draft: OperatorProductDraft) {
      const auth = needWrite("userMatchPolicy");
      if (!auth.ok) return auth;
      const checked = validateOperatorProductDraft(draft);
      if (!checked.ok) return checked;
      if (!schemaReady) {
        return failure(503, "STORE_UNREADY", "저장소가 아직 준비되지 않아 적용하지 않았어요. 완료로 표시하지 않아요.");
      }
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `11111111-1111-4111-8111-${String(products.size + 1).padStart(12, "0")}`;
      const product: OperatorProduct = {
        id,
        ...checked.data,
        revision: 1,
        supplySource: "operator",
        compositionIsNotSellableStock: true,
        moneyAuthority: moneyFromConfiguredPayout(checked.data.payoutAmount),
      };
      products.set(id, product);
      note("product-register", id, product.name);
      return {
        ok: true as const,
        status: 201,
        data: { product, ...writeMeta({ applied: true, auditAction: "admin.product.register" }) },
      };
    },
    updateProduct(id: string, draft: ProductUpdateDraft) {
      const auth = needWrite("userMatchPolicy");
      if (!auth.ok) return auth;
      if (!isUuid(id)) return failure(400, "INVALID_INPUT", "상품 번호는 정확한 식별 값이어야 해요.");
      if (!schemaReady) {
        return failure(503, "STORE_UNREADY", "저장소가 아직 준비되지 않아 적용하지 않았어요. 완료로 표시하지 않아요.");
      }
      const current = products.get(id);
      if (!current) return failure(404, "NOT_FOUND", "찾을 수 없어요. 다른 대상으로 바꾸지 않았어요.");
      if (draft.expectedRevision != null && draft.expectedRevision !== current.revision) {
        return failure(409, "REVISION_CONFLICT", "다른 직원이 먼저 바꿔서 저장하지 않았어요. 다시 불러와 주세요.");
      }
      const merged = { ...current, ...draft };
      const checked = validateOperatorProductDraft(merged);
      if (!checked.ok) return checked;
      const product: OperatorProduct = {
        ...current,
        ...checked.data,
        revision: current.revision + 1,
        moneyAuthority: moneyFromConfiguredPayout(checked.data.payoutAmount),
      };
      products.set(id, product);
      return {
        ok: true as const,
        status: 200,
        data: { product, ...writeMeta({ applied: true, revision: product.revision, auditAction: "admin.product.update" }) },
      };
    },
    updateProductVisibility(
      id: string,
      body: { visibility: ProductVisibility; selectedMemberIds?: string[]; expectedRevision?: number },
    ) {
      return this.updateProduct(id, {
        visibility: body.visibility,
        selectedMemberIds: body.selectedMemberIds ?? [],
        expectedRevision: body.expectedRevision,
      });
    },
    bumpProductRevision(id: string) {
      const current = products.get(id);
      if (!current) return false;
      products.set(id, { ...current, revision: current.revision + 1 });
      return true;
    },
    seedParticipation(row: ParticipationRow) {
      const list = participations.get(row.productId) ?? [];
      list.push(row);
      participations.set(row.productId, list);
    },
    listParticipations(id: string) {
      const auth = needRead();
      if (!auth.ok) return auth;
      if (!isUuid(id)) return failure(400, "INVALID_INPUT", "상품 번호는 정확한 식별 값이어야 해요.");
      if (!schemaReady) {
        return failure(503, "STORE_UNREADY", "저장소가 아직 준비되지 않아 적용하지 않았어요. 완료로 표시하지 않아요.");
      }
      if (!products.has(id)) {
        return failure(404, "NOT_FOUND", "찾을 수 없어요. 다른 대상으로 바꾸지 않았어요.");
      }
      return {
        ok: true as const,
        status: 200,
        data: { items: participations.get(id) ?? [], storeStatus: "ready" as const },
      };
    },
  };
}

export type IsolatedStore = ReturnType<typeof createIsolatedStore>;
