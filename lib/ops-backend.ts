export const LIVE_API_ORIGIN = "https://api.hiptk.app";
export const API_PREFIX = "/api/v1";

export const ADMIN_SESSION_COOKIE = "aipo_admin_session";
export const ADMIN_CSRF_COOKIE = "aipo_admin_csrf";
export const ADMIN_CSRF_HEADER = "x-admin-csrf";

export type Visibility = "all_public" | "selected_members" | "private";

export type AdminSession = {
  connected: boolean;
  adminId?: string;
  role?: string;
};

export type OperatorProduct = {
  id: string;
  name: string;
  compositionQty: number | null;
  payoutAmount: string;
  configuredPayoutUsdt: string;
  currency: string;
  visibility: Visibility | string;
  selectedMemberIds: string[];
  revision: number | null;
  priceConfirmationMemo: string;
  supplySource: string;
  applied?: boolean;
  raw: Record<string, unknown>;
};

export type ApiFailure = {
  http: number;
  code: string;
  applied?: boolean;
  storeStatus?: string;
  message: string;
  body: unknown;
};

export class OpsApiError extends Error {
  readonly failure: ApiFailure;
  constructor(failure: ApiFailure) {
    super(failure.message);
    this.name = "OpsApiError";
    this.failure = failure;
  }
}

export function isOpsApiError(error: unknown): error is OpsApiError {
  return error instanceof OpsApiError;
}

export function readBrowserCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    if (part.slice(0, idx) === name) {
      return decodeURIComponent(part.slice(idx + 1));
    }
  }
  return "";
}

export function mintIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ops-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function pick(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] != null) return record[key];
  }
  return undefined;
}

export function formatApiFailure(failure: ApiFailure): string {
  const bits = [failure.code || failure.message];
  if (failure.http) bits.unshift(String(failure.http));
  if (failure.storeStatus) bits.push(`storeStatus=${failure.storeStatus}`);
  if (failure.applied === false) bits.push("applied=false");
  return bits.filter(Boolean).join(" · ");
}

export function parseApiFailure(http: number, body: unknown): ApiFailure {
  const record = asRecord(body);
  const code = asString(
    pick(record, ["code", "error", "message"]) || (http ? `HTTP_${http}` : "UNKNOWN"),
  );
  const message = asString(record.message || record.code || `HTTP ${http}`);
  return {
    http,
    code,
    applied: typeof record.applied === "boolean" ? record.applied : undefined,
    storeStatus: record.storeStatus ? asString(record.storeStatus) : undefined,
    message,
    body,
  };
}

export function mapOperatorProduct(input: unknown): OperatorProduct | null {
  const record = asRecord(input);
  const nested = asRecord(record.product);
  const row = Object.keys(nested).length ? { ...record, ...nested } : record;
  const id = asString(pick(row, ["id", "productId", "opportunityId"]));
  if (!id) return null;
  const payout = asString(
    pick(row, ["payoutAmount", "configuredPayoutUsdt", "configured_payout_usdt"]) || "",
  );
  return {
    id,
    name: asString(pick(row, ["name", "title"]) || ""),
    compositionQty: asNumber(pick(row, ["compositionQty", "composition_qty"])),
    payoutAmount: payout,
    configuredPayoutUsdt: asString(
      pick(row, ["configuredPayoutUsdt", "configured_payout_usdt", "payoutAmount"]) || payout,
    ),
    currency: asString(pick(row, ["currency"]) || "USDT"),
    visibility: asString(pick(row, ["visibility"]) || ""),
    selectedMemberIds: asStringList(
      pick(row, ["selectedMemberIds", "selected_member_ids"]),
    ),
    revision: asNumber(pick(row, ["revision", "expectedRevision"])),
    priceConfirmationMemo: asString(
      pick(row, ["priceConfirmationMemo", "price_confirmation_memo"]) || "",
    ),
    supplySource: asString(pick(row, ["supplySource", "supply_source"]) || "operator"),
    applied: typeof record.applied === "boolean" ? record.applied : undefined,
    raw: row,
  };
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

type RequestOpts = {
  method?: string;
  body?: unknown;
  idempotencyKey?: string;
};

async function opsRequest(path: string, opts: RequestOpts = {}): Promise<unknown> {
  const method = (opts.method || "GET").toUpperCase();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET" && method !== "HEAD") {
    const csrf = readBrowserCookie(ADMIN_CSRF_COOKIE);
    if (csrf) headers[ADMIN_CSRF_HEADER] = csrf;
  }
  if (opts.idempotencyKey) {
    headers["Idempotency-Key"] = opts.idempotencyKey;
    headers["idempotency-key"] = opts.idempotencyKey;
  }
  const response = await fetch(`${API_PREFIX}${path}`, {
    method,
    credentials: "include",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new OpsApiError(parseApiFailure(response.status, body));
  }
  return body;
}

export async function fetchAdminSession(): Promise<AdminSession> {
  const body = asRecord(await opsRequest("/admin-session"));
  return {
    connected: body.connected === true,
    adminId: body.adminId ? asString(body.adminId) : undefined,
    role: body.role ? asString(body.role) : undefined,
  };
}

export async function loginStaff(email: string, password: string): Promise<AdminSession> {
  const body = asRecord(
    await opsRequest("/admin-session/login", {
      method: "POST",
      body: { email, password },
    }),
  );
  return {
    connected: body.connected === true,
    adminId: body.adminId ? asString(body.adminId) : undefined,
    role: body.role ? asString(body.role) : undefined,
  };
}

export async function logoutStaff(): Promise<void> {
  await opsRequest("/admin-session/logout", { method: "POST", body: {} });
}

export async function listOperatorProducts(query?: {
  limit?: number;
  cursor?: string;
  visibility?: string;
}): Promise<{ items: OperatorProduct[]; nextCursor: string | null; raw: Record<string, unknown> }> {
  const params = new URLSearchParams();
  params.set("limit", String(query?.limit ?? 50));
  if (query?.cursor) params.set("cursor", query.cursor);
  if (query?.visibility) params.set("visibility", query.visibility);
  const body = asRecord(await opsRequest(`/admin/opportunities/operator-products?${params}`));
  const rows = Array.isArray(body.items) ? body.items : Array.isArray(body.products) ? body.products : [];
  return {
    items: rows.map(mapOperatorProduct).filter((item): item is OperatorProduct => Boolean(item)),
    nextCursor: body.nextCursor ? asString(body.nextCursor) : null,
    raw: body,
  };
}

export async function getOperatorProduct(id: string): Promise<OperatorProduct> {
  const body = asRecord(await opsRequest(`/admin/opportunities/operator-products/${id}`));
  const product = mapOperatorProduct(body.product ?? body);
  if (!product) {
    throw new OpsApiError({
      http: 200,
      code: "PRODUCT_SHAPE_UNKNOWN",
      message: "상품 응답에 id가 없습니다.",
      body,
    });
  }
  return product;
}

export type RegisterOperatorProductInput = {
  name: string;
  compositionQty: number;
  payoutAmount: string;
  currency?: string;
  visibility: Visibility;
  selectedMemberIds?: string[];
  priceConfirmationMemo?: string;
  idempotencyKey: string;
};

export async function registerOperatorProduct(
  input: RegisterOperatorProductInput,
): Promise<OperatorProduct> {
  const body = {
    name: input.name,
    compositionQty: input.compositionQty,
    payoutAmount: input.payoutAmount,
    configuredPayoutUsdt: input.payoutAmount,
    configured_payout_usdt: input.payoutAmount,
    currency: input.currency || "USDT",
    visibility: input.visibility,
    selectedMemberIds:
      input.visibility === "selected_members" ? input.selectedMemberIds ?? [] : undefined,
    priceConfirmationMemo: input.priceConfirmationMemo || undefined,
    idempotencyKey: input.idempotencyKey,
  };
  const json = asRecord(
    await opsRequest("/admin/opportunities/operator-products", {
      method: "POST",
      body,
      idempotencyKey: input.idempotencyKey,
    }),
  );
  const product = mapOperatorProduct(json.product ?? json);
  if (!product) {
    throw new OpsApiError({
      http: 200,
      code: "PRODUCT_SHAPE_UNKNOWN",
      message: "등록 응답에 상품이 없습니다.",
      body: json,
    });
  }
  product.applied = typeof json.applied === "boolean" ? json.applied : true;
  return product;
}

export async function patchOperatorProduct(
  id: string,
  input: {
    expectedRevision: number;
    name?: string;
    payoutAmount?: string;
    compositionQty?: number;
    priceConfirmationMemo?: string;
  },
): Promise<OperatorProduct> {
  const body: Record<string, unknown> = { expectedRevision: input.expectedRevision };
  if (input.name != null) body.name = input.name;
  if (input.compositionQty != null) body.compositionQty = input.compositionQty;
  if (input.priceConfirmationMemo != null) body.priceConfirmationMemo = input.priceConfirmationMemo;
  if (input.payoutAmount != null) {
    body.payoutAmount = input.payoutAmount;
    body.configuredPayoutUsdt = input.payoutAmount;
    body.configured_payout_usdt = input.payoutAmount;
  }
  const json = asRecord(
    await opsRequest(`/admin/opportunities/${id}/operator-product`, {
      method: "PATCH",
      body,
    }),
  );
  const product = mapOperatorProduct(json.product ?? json);
  if (!product) {
    throw new OpsApiError({
      http: 200,
      code: "PRODUCT_SHAPE_UNKNOWN",
      message: "수정 응답에 상품이 없습니다.",
      body: json,
    });
  }
  return product;
}

export async function patchOperatorVisibility(
  id: string,
  input: {
    expectedRevision: number;
    visibility: Visibility;
    selectedMemberIds?: string[];
  },
): Promise<OperatorProduct> {
  const body: Record<string, unknown> = {
    expectedRevision: input.expectedRevision,
    visibility: input.visibility,
  };
  if (input.visibility === "selected_members") {
    body.selectedMemberIds = input.selectedMemberIds ?? [];
  }
  const json = asRecord(
    await opsRequest(`/admin/opportunities/${id}/visibility`, {
      method: "PATCH",
      body,
    }),
  );
  const product = mapOperatorProduct(json.product ?? json);
  if (!product) {
    throw new OpsApiError({
      http: 200,
      code: "PRODUCT_SHAPE_UNKNOWN",
      message: "공개 범위 응답에 상품이 없습니다.",
      body: json,
    });
  }
  return product;
}

export type ParticipationRow = {
  id: string;
  userId: string;
  status: string;
  configuredPayoutUsdt: string;
  createdAt: string;
  raw: Record<string, unknown>;
};

export async function listParticipations(id: string): Promise<{
  items: ParticipationRow[];
  unavailable?: ApiFailure;
}> {
  try {
    const body = asRecord(await opsRequest(`/admin/opportunities/${id}/participations`));
    const rows = Array.isArray(body.items)
      ? body.items
      : Array.isArray(body.participations)
        ? body.participations
        : [];
    return {
      items: rows.map((row) => {
        const record = asRecord(row);
        return {
          id: asString(pick(record, ["id", "participationId"]) || ""),
          userId: asString(pick(record, ["userId", "user_id", "memberId"]) || ""),
          status: asString(pick(record, ["status"]) || ""),
          configuredPayoutUsdt: asString(
            pick(record, ["configuredPayoutUsdt", "configured_payout_usdt", "payoutAmount"]) || "",
          ),
          createdAt: asString(pick(record, ["createdAt", "created_at"]) || ""),
          raw: record,
        };
      }),
    };
  } catch (error) {
    if (isOpsApiError(error) && (error.failure.http === 404 || error.failure.http === 503)) {
      return { items: [], unavailable: error.failure };
    }
    throw error;
  }
}

export type DirectoryMember = {
  userId: string;
  resellerId: string;
  membership: string;
};

export async function searchMembers(q: string): Promise<{
  items: DirectoryMember[];
  unavailable?: ApiFailure;
}> {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  try {
    const body = asRecord(await opsRequest(`/admin/users${params.size ? `?${params}` : ""}`));
    const rows = Array.isArray(body.items) ? body.items : [];
    return {
      items: rows.map((row) => {
        const record = asRecord(row);
        return {
          userId: asString(pick(record, ["userId", "id"]) || ""),
          resellerId: asString(pick(record, ["resellerId", "referral_code"]) || ""),
          membership: asString(pick(record, ["membership"]) || ""),
        };
      }).filter((item) => item.userId),
    };
  } catch (error) {
    if (isOpsApiError(error)) {
      return { items: [], unavailable: error.failure };
    }
    throw error;
  }
}

export const VISIBILITY_LABEL: Record<string, string> = {
  all_public: "모든 회원에게 보이기",
  selected_members: "지정한 회원만",
  private: "비공개",
};

export function nextActionForFailure(failure: ApiFailure): string {
  if (failure.code === "STORE_UNREADY") {
    return "저장소가 아직 준비되지 않았습니다. 화면에서 성공으로 바꾸지 않았습니다. 백엔드 준비 상태를 확인한 뒤 다시 시도해 주세요.";
  }
  if (failure.code === "REVISION_CONFLICT" || failure.http === 409) {
    return "다른 변경이 먼저 저장되었습니다. 최신 내용을 불러온 뒤 다시 저장해 주세요. 덮어쓰지 않았습니다.";
  }
  if (failure.code === "ADMIN_AUTH_INVALID") {
    return "아이디 또는 비밀번호가 맞지 않습니다. 다시 입력해 주세요.";
  }
  if (failure.code === "ADMIN_AUTH_REQUIRED" || failure.http === 401) {
    return "운영자 로그인이 필요합니다. 다시 로그인해 주세요.";
  }
  if (failure.code === "ADMIN_AUTH_NOT_CONFIGURED") {
    return "운영자 로그인이 서버에 아직 설정되지 않았습니다.";
  }
  return "요청이 반영되지 않았습니다. 아래 서버 내용을 확인한 뒤 다시 시도해 주세요.";
}
