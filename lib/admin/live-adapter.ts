import {
  MEMBERSHIP_ADMIN_ROUTES,
  ADMIN_SESSION_ROUTES,
  MALL_ADMIN_ROUTES,
  isMembershipId,
  isUuid,
  sameUserId,
} from "./contract.ts";
import { adminFetch, unwrapApplied } from "./client.ts";
import {
  asRecord,
  failure,
  readFiniteInt,
  readString,
  unknownUnavailable,
  userMismatch,
  type AdminResult,
} from "./errors.ts";
import { assertScopedUserId, readScopedUserId } from "./identity.ts";
import { moneyFromConfiguredPayout, readMoneyAuthority } from "./money-authority.ts";
import { resolveOrigin } from "./origin.ts";
import { compiledUnreadyListing, validatePresentationProfile, type PresentationListing } from "./presentation.ts";
import {
  persistBodyFromDraft,
  validateOperatorProductDraft,
  type OperatorProduct,
} from "./product.ts";
import type {
  AdminOpsPort,
  AdminSession,
  BonusGrant,
  BonusList,
  DailyMatchQuota,
  DirectoryLookup,
  GradeDailyCaps,
  MembershipSnapshot,
  ParticipationRow,
  ProductWriteResult,
  UserMembership,
  WriteMeta,
} from "./types.ts";

function liveSession(row: unknown): AdminSession {
  const rec = asRecord(row);
  return {
    connected: rec?.connected === true,
    adminId: readString(rec?.adminId) ?? undefined,
    role: readString(rec?.role) ?? undefined,
    mode: "live",
  };
}

function readQuota(row: unknown, userId: string): DailyMatchQuota | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const responseUserId = readString(rec.userId);
  if (responseUserId && !sameUserId(responseUserId, userId)) return null;
  const cap = readFiniteInt(rec.cap);
  const used = readFiniteInt(rec.used);
  const remaining = readFiniteInt(rec.remaining ?? rec.participateRemaining);
  if (cap == null || used == null || remaining == null) return null;
  if (readString(rec.source) == null) return null;
  return {
    userId: responseUserId ?? userId,
    cap,
    used,
    remaining,
    source: String(rec.source),
    blocked: rec.blocked === true,
    usedCountBasis: "accepted_participate_requests_kst_day",
    timezone: rec.timezone === "Asia/Seoul" ? "Asia/Seoul" : undefined,
    baseRemaining: readFiniteInt(rec.baseRemaining) ?? undefined,
    bonusRemaining: readFiniteInt(rec.bonusRemaining) ?? undefined,
    participateRemaining: readFiniteInt(rec.participateRemaining) ?? remaining,
    explicitParticipateBlock: rec.explicitParticipateBlock === true,
    storeStatus: rec.storeStatus === "ready" || rec.storeStatus === "unready" ? rec.storeStatus : undefined,
    schemaReady: rec.schemaReady === true,
    persistence: readString(rec.persistence) ?? undefined,
    bonusSource: readString(rec.bonusSource) ?? undefined,
    gradeCapSource: readString(rec.gradeCapSource) ?? undefined,
  };
}

function readMembership(row: unknown): UserMembership | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const userId = readString(rec.userId);
  const membership = readString(rec.membership);
  const cap = readFiniteInt(rec.dailyUserMatchCap);
  const used = readFiniteInt(rec.dailyMatchesUsed);
  if (!userId || !membership || !isMembershipId(membership) || cap == null || used == null) return null;
  return {
    userId,
    membership,
    maxCapitalBand: readString(rec.maxCapitalBand) ?? "unknown",
    dailyUserMatchCap: cap,
    matchStrictness: readString(rec.matchStrictness) ?? "unknown",
    adminForce: rec.adminForce === true,
    dailyMatchesUsed: used,
    fulfillRate7d: typeof rec.fulfillRate7d === "number" ? rec.fulfillRate7d : null,
    updatedAt: readString(rec.updatedAt) ?? undefined,
  };
}

function snapshotFromBody(body: unknown, userId: string): AdminResult<MembershipSnapshot> {
  const rec = asRecord(body);
  if (!rec) return unknownUnavailable();
  const membership = readMembership(rec.membership) ?? readMembership(rec);
  const quota = readQuota(rec.quota, userId);
  if (!membership || !quota) return unknownUnavailable();
  if (!sameUserId(membership.userId, userId) || !sameUserId(quota.userId, userId)) {
    return userMismatch();
  }
  const gradeControl = rec.gradeControl === "MANUAL_PIN" ? "MANUAL_PIN" : rec.gradeControl === "AUTO" ? "AUTO" : null;
  if (!gradeControl) return unknownUnavailable();
  const resellerId = readString(rec.resellerId);
  return {
    ok: true,
    status: 200,
    data: {
      membership,
      labelKo: readString(rec.labelKo) ?? membership.membership,
      quota,
      gradeControl,
      autoDowngrade: false,
      fulfillRateReadOnly: true,
      ledgerMutated: false,
      ...(resellerId ? { resellerId } : {}),
    },
  };
}

function readBonusList(body: unknown, userId: string): AdminResult<BonusList> {
  const rec = asRecord(body);
  if (!rec || !Array.isArray(rec.grants)) return unknownUnavailable();
  const responseUserId = readString(rec.userId);
  if (responseUserId && !sameUserId(responseUserId, userId)) return userMismatch();
  for (const raw of rec.grants) {
    const grant = asRecord(raw);
    const grantUser = readString(grant?.userId);
    if (grantUser && !sameUserId(grantUser, userId)) return userMismatch();
  }
  return { ok: true, status: 200, data: rec as BonusList };
}

function readProduct(row: unknown): OperatorProduct | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const id = readString(rec.id);
  const checked = validateOperatorProductDraft({
    name: readString(rec.name) ?? "",
    description: readString(rec.description) ?? "",
    photos: Array.isArray(rec.photos) ? rec.photos.map((p) => String(p)) : [],
    compositionQty: rec.compositionQty as number,
    payoutAmount: readString(rec.payoutAmount) ?? "",
    currency: readString(rec.currency) ?? "USDT",
    visibility: readString(rec.visibility) ?? "all_public",
    selectedMemberIds: Array.isArray(rec.selectedMemberIds) ? rec.selectedMemberIds.map((p) => String(p)) : [],
    priceConfirmationMemo: readString(rec.priceConfirmationMemo) ?? "",
  });
  if (!id || !checked.ok) return null;
  const money =
    rec.moneyAuthority != null
      ? readMoneyAuthority(rec)
      : moneyFromConfiguredPayout(checked.data.payoutAmount);
  return {
    id,
    ...checked.data,
    revision: readFiniteInt(rec.revision) ?? 1,
    supplySource: "operator",
    compositionIsNotSellableStock: true,
    moneyAuthority: money ?? undefined,
  };
}

function writeFlags(body: unknown): WriteMeta {
  const rec = asRecord(body);
  const applied = unwrapApplied(rec);
  return {
    applied,
    storeStatus: rec?.storeStatus === "ready" ? "ready" : "unready",
    schemaReady: rec?.schemaReady === true,
    persistence: readString(rec?.persistence) ?? undefined,
    replay: rec?.replay === true,
    ledgerMutated: false,
    auditAction: readString(rec?.auditAction) ?? undefined,
    revision: readFiniteInt(rec?.revision) ?? undefined,
  };
}

export function createLiveAdapter(): AdminOpsPort {
  return {
    async session() {
      const origin = resolveOrigin();
      if (origin.mode !== "live") {
        return {
          ok: true,
          status: 200,
          data: { connected: false, mode: origin.mode },
        };
      }
      const res = await adminFetch<unknown>("GET", ADMIN_SESSION_ROUTES.status);
      if (!res.ok) return res;
      return { ok: true, status: res.status, data: liveSession(res.data) };
    },
    async isolatedLogin() {
      return failure(401, "ADMIN_AUTH_LOGIN_UNIMPLEMENTED", "운영 환경에서는 격리 시험 로그인을 쓸 수 없어요.");
    },
    async login(email, password) {
      const res = await adminFetch<unknown>("POST", ADMIN_SESSION_ROUTES.login, { email, password }, { csrf: false });
      if (!res.ok) return res;
      const session = liveSession(res.data);
      if (!session.connected) {
        return failure(
          503,
          "STORE_UNREADY",
          "저장소가 아직 준비되지 않아 적용하지 않았어요. 완료로 표시하지 않아요.",
          res.data,
        );
      }
      return { ok: true, status: res.status, data: session };
    },
    async logout() {
      const res = await adminFetch<unknown>("POST", ADMIN_SESSION_ROUTES.logout, {});
      if (!res.ok) return res;
      return { ok: true, status: res.status, data: { connected: false } };
    },
    async lookupUser(userId) {
      if (!isUuid(userId)) return failure(400, "INVALID_INPUT", "회원 번호는 정확한 회원 식별 값이어야 해요.");
      const res = await adminFetch<unknown>(
        "GET",
        `${MEMBERSHIP_ADMIN_ROUTES.directory}?q=${encodeURIComponent(userId.trim())}`,
      );
      if (!res.ok) return res;
      const rec = asRecord(res.data);
      const items = Array.isArray(rec?.items) ? rec.items : [];
      if (items.length === 0) {
        return failure(404, "NOT_FOUND", "이 회원 번호는 찾을 수 없어요. 다른 회원으로 바꾸지 않았어요.");
      }
      const first = asRecord(items[0]);
      const foundId = readString(first?.userId);
      const membership = readString(first?.membership);
      if (!foundId || !membership || !isMembershipId(membership)) return unknownUnavailable();
      if (!sameUserId(foundId, userId)) return userMismatch();
      if (rec?.substituted === true) return userMismatch();
      const resellerId = readString(first?.resellerId);
      return {
        ok: true,
        status: res.status,
        data: {
          userId: foundId,
          membership,
          exact: true as const,
          substituted: false as const,
          ...(resellerId ? { resellerId } : {}),
        },
      } satisfies { ok: true; status: number; data: DirectoryLookup };
    },
    async getMembership(userId) {
      if (!isUuid(userId)) return failure(400, "INVALID_INPUT", "회원 번호는 정확한 회원 식별 값이어야 해요.");
      const res = await adminFetch<unknown>("GET", MEMBERSHIP_ADMIN_ROUTES.membership(userId));
      if (!res.ok) return res;
      return snapshotFromBody(res.data, userId);
    },
    async putDailyMatchCap(userId, body) {
      if (!isUuid(userId)) return failure(400, "INVALID_INPUT", "회원 번호는 정확한 회원 식별 값이어야 해요.");
      const res = await adminFetch<unknown>("PUT", MEMBERSHIP_ADMIN_ROUTES.dailyMatchCap(userId), {
        dailyUserMatchCap: body.dailyUserMatchCap,
        clear: body.clear === true,
        reason: body.reason,
        capOnly: true,
      });
      if (!res.ok) return res;
      const snap = snapshotFromBody(res.data, userId);
      if (!snap.ok) {
        const again = await this.getMembership(userId);
        if (!again.ok) return again;
        return { ok: true, status: res.status, data: { ...again.data, ...writeFlags(res.data) } };
      }
      return { ok: true, status: res.status, data: { ...snap.data, ...writeFlags(res.data) } };
    },
    async forceMembership(userId, body) {
      if (!isUuid(userId)) return failure(400, "INVALID_INPUT", "회원 번호는 정확한 회원 식별 값이어야 해요.");
      const res = await adminFetch<unknown>("PUT", MEMBERSHIP_ADMIN_ROUTES.membership(userId), {
        membership: body.membership,
        clearForce: body.clearForce === true,
        reason: body.reason,
      });
      if (!res.ok) return res;
      const rec = asRecord(res.data);
      const membership = readMembership(rec?.membership) ?? readMembership(res.data);
      if (!membership) return unknownUnavailable();
      if (!sameUserId(membership.userId, userId)) return userMismatch();
      return { ok: true, status: res.status, data: { membership, ...writeFlags(res.data) } };
    },
    async listBonus(userId) {
      if (!isUuid(userId)) return failure(400, "INVALID_INPUT", "회원 번호는 정확한 회원 식별 값이어야 해요.");
      const res = await adminFetch<unknown>("GET", MEMBERSHIP_ADMIN_ROUTES.bonusGrants(userId));
      if (!res.ok) return res;
      const listed = readBonusList(res.data, userId);
      if (!listed.ok) return listed;
      return { ok: true, status: res.status, data: listed.data };
    },
    async grantBonus(userId, body) {
      if (!isUuid(userId)) return failure(400, "INVALID_INPUT", "회원 번호는 정확한 회원 식별 값이어야 해요.");
      const res = await adminFetch<unknown>("PUT", MEMBERSHIP_ADMIN_ROUTES.bonusGrants(userId), body);
      if (!res.ok) return res;
      const rec = asRecord(res.data);
      const grant = rec?.grant as BonusGrant | undefined;
      if (!grant) return unknownUnavailable();
      const grantScoped = assertScopedUserId(readScopedUserId(grant), userId);
      if (!grantScoped.ok) return grantScoped;
      return { ok: true, status: res.status, data: { grant, ...writeFlags(res.data) } };
    },
    async reclaimBonus(userId, body) {
      if (!isUuid(userId)) return failure(400, "INVALID_INPUT", "회원 번호는 정확한 회원 식별 값이어야 해요.");
      const res = await adminFetch<unknown>("PUT", MEMBERSHIP_ADMIN_ROUTES.bonusReclaim(userId), body);
      if (!res.ok) return res;
      const rec = asRecord(res.data);
      const reclaimed = readFiniteInt(rec?.reclaimed);
      const remaining = readFiniteInt(rec?.remaining);
      if (reclaimed == null || remaining == null) return unknownUnavailable();
      const scoped = assertScopedUserId(readScopedUserId(rec), userId);
      if (!scoped.ok) return scoped;
      return { ok: true, status: res.status, data: { reclaimed, remaining, ...writeFlags(res.data) } };
    },
    async quotaProjection(userId) {
      if (!isUuid(userId)) return failure(400, "INVALID_INPUT", "회원 번호는 정확한 회원 식별 값이어야 해요.");
      const res = await adminFetch<unknown>("GET", MEMBERSHIP_ADMIN_ROUTES.quotaProjection(userId));
      if (!res.ok) return res;
      const rec = asRecord(res.data);
      const quota = readQuota(rec?.quota, userId);
      const gradeControl = rec?.gradeControl === "MANUAL_PIN" || rec?.gradeControl === "AUTO" ? rec.gradeControl : null;
      if (!quota || !gradeControl) return unknownUnavailable();
      return { ok: true, status: res.status, data: { quota, gradeControl } };
    },
    async listGradeDailyCaps() {
      const res = await adminFetch<unknown>("GET", MEMBERSHIP_ADMIN_ROUTES.gradeDailyCaps);
      if (!res.ok) return res;
      const rec = asRecord(res.data);
      const caps = asRecord(rec?.caps);
      const revision = readFiniteInt(rec?.revision);
      if (!caps || revision == null) return unknownUnavailable();
      return { ok: true, status: res.status, data: rec as GradeDailyCaps };
    },
    async putGradeDailyCap(body) {
      const res = await adminFetch<unknown>("PUT", MEMBERSHIP_ADMIN_ROUTES.gradeDailyCaps, body);
      if (!res.ok) return res;
      const listed = await this.listGradeDailyCaps();
      if (!listed.ok) {
        const flags = writeFlags(res.data);
        if (!flags.applied) return unknownUnavailable();
        return unknownUnavailable();
      }
      return { ok: true, status: res.status, data: { ...listed.data, ...writeFlags(res.data) } };
    },
    async listPresentation() {
      const res = await adminFetch<unknown>("GET", MEMBERSHIP_ADMIN_ROUTES.presentationProfile);
      if (!res.ok) return res;
      const rec = asRecord(res.data);
      if (!rec) return { ok: true, status: 200, data: compiledUnreadyListing() };
      const profile = rec.profile ?? rec;
      const checked = validatePresentationProfile(profile);
      if (!checked.ok) return unknownUnavailable();
      return {
        ok: true,
        status: res.status,
        data: {
          ...checked.data,
          revision: readFiniteInt(rec.revision) ?? 0,
          persistence: readString(rec.persistence) ?? "compiled_v19_schema_unready",
          schemaReady: rec.schemaReady === true,
          schemaApplied: rec.schemaApplied === true,
          storeStatus: rec.storeStatus === "ready" ? "ready" : "unready",
          operatorSecondsApplied: rec.operatorSecondsApplied === true,
          operatorTimeSettingsComplete: rec.operatorTimeSettingsComplete === true,
          compiledV19IsNotOperatorComplete: rec.compiledV19IsNotOperatorComplete !== false,
          fiveStepDraftIgnored: rec.fiveStepDraftIgnored === true,
          applied: rec.applied === true,
          moneyUntouched: true,
          capUntouched: true,
          gradeUntouched: true,
          engineDeadlineUntouched: true,
          resultUntouched: true,
          settleTriggeredByPresentation: false,
        } satisfies PresentationListing,
      };
    },
    async putPresentation(body) {
      const checked = validatePresentationProfile(body.profile);
      if (!checked.ok) return checked;
      const res = await adminFetch<unknown>("PUT", MEMBERSHIP_ADMIN_ROUTES.presentationProfile, {
        profile: {
          profileId: checked.data.profileId,
          contractVersion: checked.data.contractVersion,
          phases: checked.data.phases,
          totalDurationSec: checked.data.totalDurationSec,
        },
        reason: body.reason,
        expectedRevision: body.expectedRevision,
      });
      if (!res.ok) return res;
      const flags = writeFlags(res.data);
      const listed = await this.listPresentation();
      if (!listed.ok) {
        if (!flags.applied) return unknownUnavailable();
        return unknownUnavailable();
      }
      return { ok: true, status: res.status, data: { ...listed.data, ...flags } };
    },
    async previewProduct(draft) {
      const checked = validateOperatorProductDraft(draft);
      if (!checked.ok) return checked;
      return { ok: true, status: 200, data: { persist: persistBodyFromDraft(checked.data) } };
    },
    async registerProduct(draft) {
      const checked = validateOperatorProductDraft(draft);
      if (!checked.ok) return checked;
      const res = await adminFetch<unknown>("POST", MALL_ADMIN_ROUTES.register, persistBodyFromDraft(checked.data));
      if (!res.ok) return res;
      const rec = asRecord(res.data);
      const product = readProduct(rec?.product ?? res.data);
      const flags = writeFlags(res.data);
      if (!product) {
        if (!flags.applied) {
          return failure(
            res.status,
            "STORE_UNREADY",
            "저장소가 아직 준비되지 않아 적용하지 않았어요. 완료로 표시하지 않아요.",
            res.data,
          );
        }
        return unknownUnavailable();
      }
      return { ok: true, status: res.status, data: { product, ...flags } satisfies ProductWriteResult };
    },
    async updateProduct(id, draft) {
      if (!isUuid(id)) return failure(400, "INVALID_INPUT", "상품 번호는 정확한 식별 값이어야 해요.");
      const { expectedRevision, ...fields } = draft;
      const body =
        expectedRevision != null ? { ...fields, expectedRevision } : fields;
      const res = await adminFetch<unknown>("PATCH", MALL_ADMIN_ROUTES.update(id), body);
      if (!res.ok) return res;
      const rec = asRecord(res.data);
      const product = readProduct(rec?.product ?? res.data);
      const flags = writeFlags(res.data);
      if (!product) {
        if (!flags.applied) {
          return failure(
            res.status,
            "STORE_UNREADY",
            "저장소가 아직 준비되지 않아 적용하지 않았어요. 완료로 표시하지 않아요.",
            res.data,
          );
        }
        return unknownUnavailable();
      }
      return { ok: true, status: res.status, data: { product, ...flags } };
    },
    async updateProductVisibility(id, body) {
      if (!isUuid(id)) return failure(400, "INVALID_INPUT", "상품 번호는 정확한 식별 값이어야 해요.");
      const res = await adminFetch<unknown>("PATCH", MALL_ADMIN_ROUTES.visibility(id), body);
      if (!res.ok) return res;
      const rec = asRecord(res.data);
      const product = readProduct(rec?.product ?? res.data);
      const flags = writeFlags(res.data);
      if (!product) {
        if (!flags.applied) {
          return failure(
            res.status,
            "STORE_UNREADY",
            "저장소가 아직 준비되지 않아 적용하지 않았어요. 완료로 표시하지 않아요.",
            res.data,
          );
        }
        return unknownUnavailable();
      }
      return { ok: true, status: res.status, data: { product, ...flags } };
    },
    async listParticipations(id) {
      if (!isUuid(id)) return failure(400, "INVALID_INPUT", "상품 번호는 정확한 식별 값이어야 해요.");
      const res = await adminFetch<unknown>("GET", MALL_ADMIN_ROUTES.participations(id));
      if (!res.ok) return res;
      const rec = asRecord(res.data);
      const items = Array.isArray(rec?.items) ? rec.items : [];
      const parsed: ParticipationRow[] = [];
      for (const raw of items) {
        const row = asRecord(raw);
        const pid = readString(row?.id);
        const userId = readString(row?.userId);
        const productId = readString(row?.productId) ?? id;
        if (!pid || !userId) continue;
        const snap = asRecord(row?.snapshot);
        const money = readMoneyAuthority(row) ?? readMoneyAuthority(snap);
        parsed.push({
          id: pid,
          userId,
          productId,
          payoutStatus: readString(row?.payoutStatus) ?? undefined,
          ...(snap
            ? {
                snapshot: {
                  payoutAmount: readString(snap.payoutAmount) ?? undefined,
                  visibility: readString(snap.visibility) ?? undefined,
                  productRevision: readFiniteInt(snap.productRevision) ?? undefined,
                },
              }
            : {}),
          ...(money ? { moneyAuthority: money } : {}),
        });
      }
      return {
        ok: true,
        status: res.status,
        data: {
          items: parsed,
          storeStatus: rec?.storeStatus === "ready" ? "ready" : "unready",
        },
      };
    },
  };
}
