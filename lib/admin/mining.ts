import { adminFetch } from "./client.ts";
import type { AdminResult } from "./errors.ts";

export const MINE_STATUS_LABELS: Record<string, string> = {
  READY: "준비",
  ACTIVE: "가동",
  NEW_POSITIONS_PAUSED: "신규운용중지",
  PAUSED: "일시정지",
  ENDED: "종료",
};

export const RATE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "초안",
  APPROVAL_PENDING: "승인대기",
  SCHEDULED: "예약",
  ACTIVE: "적용중",
  ENDED: "종료",
};

export const POSITION_STATUS_LABELS: Record<string, string> = {
  START_PENDING: "시작대기",
  ACTIVE: "운용중",
  DECREASE_PENDING: "감액처리중",
  END_PENDING: "종료처리중",
  ENDED: "종료",
};

export const SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  CALC_PENDING: "계산대기",
  CALCULATED: "계산완료",
  LEDGER_POSTED: "원장반영완료",
  FAILED: "실패",
  REVIEW_REQUIRED: "검토필요",
};

export type MineSummary = {
  mineId: string;
  code: string;
  displayName: string;
  description: string;
  assetCode: string;
  status: string;
  principalCurrency: string;
  minPrincipalAmount: string | null;
  maxPrincipalAmount: string | null;
  displayOrder: number;
  metadata: Record<string, unknown>;
  publishedAt: string | null;
  endedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  positionCount?: number;
  activePositionCount?: number;
};

export type RateVersion = {
  rateVersionId: string;
  mineId: string;
  versionNo: number;
  status: string;
  dailyRate: string;
  effectiveAt: string | null;
  endedAt: string | null;
  approvalRequestedAt: string | null;
  approvedAt: string | null;
  approvalRequestId: string | null;
  createdByAdminId: string | null;
  approvedByAdminId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MineDetail = MineSummary & { rateVersions: RateVersion[] };

export type PositionSummary = {
  positionId: string;
  userId: string;
  mineId: string;
  mineCode: string;
  mineName: string;
  status: string;
  requestedPrincipalAmount: string;
  principalAmount: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PositionEvent = {
  eventId: string;
  eventType: string;
  amount: string;
  principalBeforeAmount: string;
  principalAfterAmount: string;
  effectiveAt: string | null;
  ledgerJournalId: string | null;
  createdAt: string | null;
};

export type PositionDetail = PositionSummary & { events: PositionEvent[] };

export type SettlementSummary = {
  settlementId: string;
  positionId: string;
  userId: string;
  mineId: string;
  mineCode: string;
  mineName: string;
  status: string;
  periodStartAt: string | null;
  periodEndAt: string | null;
  calculatedProfitAmount: string;
  creditedProfitAmount: string;
  ledgerJournalId: string | null;
  attemptCount: number;
  failureCode: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SettlementAccrual = {
  accrualId: string;
  rateVersionId: string;
  periodStartAt: string | null;
  periodEndAt: string | null;
  principalAmount: string;
  dailyRate: string;
  profitAmount: string;
  calcVersion: string;
};

export type SettlementDetail = SettlementSummary & { accruals: SettlementAccrual[] };

export type MiningSwitch = { id: string; engaged: boolean };

function requestKey(prefix: string): string {
  const cryptoApi = typeof crypto !== "undefined" ? crypto : null;
  const uuid = cryptoApi && "randomUUID" in cryptoApi ? cryptoApi.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${uuid}`.slice(0, 128);
}

function mutation<T>(method: "POST" | "PATCH" | "PUT", path: string, body: Record<string, unknown>, prefix: string) {
  return adminFetch<T>(method, path, body, {
    headers: { "Idempotency-Key": requestKey(prefix) },
  });
}

function qs(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim() !== "") params.set(key, String(value));
  });
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

export const miningAdmin = {
  listMines(limit = 200): Promise<AdminResult<{ items: MineSummary[] }>> {
    return adminFetch("GET", `/admin/mines${qs({ limit })}`);
  },
  getMine(mineId: string): Promise<AdminResult<MineDetail>> {
    return adminFetch("GET", `/admin/mines/${encodeURIComponent(mineId)}`);
  },
  createMine(body: {
    code: string;
    displayName: string;
    description: string;
    assetCode: string;
    minPrincipalAmount?: string;
    maxPrincipalAmount?: string;
    displayOrder: number;
    reason: string;
  }): Promise<AdminResult<MineSummary>> {
    return mutation("POST", "/admin/mines", body, "mine-create");
  },
  updateMine(mineId: string, body: Record<string, unknown>): Promise<AdminResult<MineSummary>> {
    return mutation("PATCH", `/admin/mines/${encodeURIComponent(mineId)}`, body, "mine-update");
  },
  mineAction(mineId: string, action: "publish" | "pause-new-positions" | "pause" | "resume" | "end", reason: string): Promise<AdminResult<MineSummary>> {
    return mutation("POST", `/admin/mines/${encodeURIComponent(mineId)}/${action}`, { reason }, `mine-${action}`);
  },
  listRates(mineId: string, limit = 100): Promise<AdminResult<{ items: RateVersion[] }>> {
    return adminFetch("GET", `/admin/mines/${encodeURIComponent(mineId)}/rates${qs({ limit })}`);
  },
  createRate(mineId: string, dailyRate: string, reason: string): Promise<AdminResult<RateVersion>> {
    return mutation("POST", `/admin/mines/${encodeURIComponent(mineId)}/rates`, { dailyRate, reason }, "rate-create");
  },
  updateRate(mineId: string, rateVersionId: string, dailyRate: string, reason: string): Promise<AdminResult<RateVersion>> {
    return mutation("PATCH", `/admin/mines/${encodeURIComponent(mineId)}/rates/${encodeURIComponent(rateVersionId)}`, { dailyRate, reason }, "rate-update");
  },
  rateAction(
    mineId: string,
    rateVersionId: string,
    action: "request-approval" | "approve",
    reason: string,
  ): Promise<AdminResult<RateVersion>> {
    return mutation("POST", `/admin/mines/${encodeURIComponent(mineId)}/rates/${encodeURIComponent(rateVersionId)}/${action}`, { reason }, `rate-${action}`);
  },
  scheduleRate(mineId: string, rateVersionId: string, effectiveAt: string, reason: string): Promise<AdminResult<RateVersion>> {
    return mutation("POST", `/admin/mines/${encodeURIComponent(mineId)}/rates/${encodeURIComponent(rateVersionId)}/schedule`, { effectiveAt, reason }, "rate-schedule");
  },
  listPositions(filters: { mineId?: string; userId?: string; status?: string; limit?: number } = {}): Promise<AdminResult<{ items: PositionSummary[] }>> {
    return adminFetch("GET", `/admin/mining/positions${qs({ ...filters, limit: filters.limit ?? 100 })}`);
  },
  getPosition(positionId: string): Promise<AdminResult<PositionDetail>> {
    return adminFetch("GET", `/admin/mining/positions/${encodeURIComponent(positionId)}`);
  },
  listSettlements(filters: { mineId?: string; userId?: string; status?: string; limit?: number } = {}): Promise<AdminResult<{ items: SettlementSummary[] }>> {
    return adminFetch("GET", `/admin/mining/settlements${qs({ ...filters, limit: filters.limit ?? 100 })}`);
  },
  getSettlement(settlementId: string): Promise<AdminResult<SettlementDetail>> {
    return adminFetch("GET", `/admin/mining/settlements/${encodeURIComponent(settlementId)}`);
  },
  retrySettlement(settlementId: string, reason: string): Promise<AdminResult<SettlementDetail>> {
    return mutation("POST", `/admin/mining/settlements/${encodeURIComponent(settlementId)}/retry`, { reason }, "settlement-retry");
  },
  listSwitches(): Promise<AdminResult<{ version: 1; items: MiningSwitch[] }>> {
    return adminFetch("GET", "/admin/system-control/switches");
  },
  setSwitch(id: "MINING_NEW_POSITIONS_PAUSE" | "MINING_SETTLEMENT_PAUSE", engaged: boolean, reason: string): Promise<AdminResult<{ id: string; engaged: boolean; items: MiningSwitch[] }>> {
    return mutation("PUT", "/admin/system-control/switches", { id, engaged, reason }, "mining-switch");
  },
};

export function miningFailureMessage(result: AdminResult<unknown>): string {
  if (result.ok) return "";
  const raw = result.raw && typeof result.raw === "object" ? result.raw as Record<string, unknown> : null;
  const first = raw?.message;
  if (typeof first === "string" && first.trim() && !/^[A-Z0-9_ -]+$/.test(first.trim())) return first.trim();
  if (first && typeof first === "object" && !Array.isArray(first)) {
    const nested = first as Record<string, unknown>;
    if (typeof nested.message === "string" && nested.message.trim()) return nested.message.trim();
  }
  return result.message;
}

export function mineStatusLabel(status: string): string {
  return MINE_STATUS_LABELS[status] ?? "상태 확인 필요";
}

export function rateStatusLabel(status: string): string {
  return RATE_STATUS_LABELS[status] ?? "상태 확인 필요";
}

export function positionStatusLabel(status: string): string {
  return POSITION_STATUS_LABELS[status] ?? "상태 확인 필요";
}

export function settlementStatusLabel(status: string): string {
  return SETTLEMENT_STATUS_LABELS[status] ?? "상태 확인 필요";
}
