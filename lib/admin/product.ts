/** 확인된 mall CJS 필드만. 제안 필드와 섞어 persist하지 않는다. */

import {
  PRODUCT_CURRENCY,
  isProductVisibility,
  isUuid,
  type ProductVisibility,
} from "./contract.ts";
import { failure, type AdminResult } from "./errors.ts";
import {
  moneyDisplayLines,
  moneyFromConfiguredPayout,
  readMoneyAuthority,
  type MoneyAuthority,
} from "./money-authority.ts";

const AMOUNT_MAX_LEN = 80;
const SCALE = 18;
const MEMO_MAX = 2000;

export type OperatorProductDraft = {
  name: string;
  description: string;
  photos: string[];
  compositionQty: number;
  payoutAmount: string;
  requiredCapitalUsdt: string;
  expectedProfitKrwApprox?: string;
  currency: typeof PRODUCT_CURRENCY;
  visibility: ProductVisibility;
  selectedMemberIds: string[];
  priceConfirmationMemo: string;
};

export type OperatorProduct = OperatorProductDraft & {
  id: string;
  revision: number;
  supplySource: "operator";
  compositionIsNotSellableStock: true;
  moneyAuthority?: MoneyAuthority;
};

export type ProductProposedFields = {
  baseAmount: string;
  costAmount: string;
};

export type ProductPreview = {
  persist: OperatorProductDraft;
  proposed: ProductProposedFields;
  persistable: true;
};

function isDecimalAmount(raw: string): boolean {
  if (typeof raw !== "string") return false;
  const n = raw.length;
  if (n < 1 || n > AMOUNT_MAX_LEN) return false;
  let i = 0;
  if (raw.charCodeAt(0) === 45) {
    if (n === 1) return false;
    i = 1;
  }
  let digits = 0;
  let frac = 0;
  let dot = false;
  for (; i < n; i += 1) {
    const c = raw.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      if (dot) frac += 1;
      else digits += 1;
      continue;
    }
    if (c === 46 && !dot && digits > 0) {
      dot = true;
      continue;
    }
    return false;
  }
  if (digits < 1) return false;
  if (dot && frac < 1) return false;
  return true;
}

function parseAmount(raw: string): bigint {
  const neg = raw.startsWith("-");
  const body = neg ? raw.slice(1) : raw;
  const [wholePart, fracPart = ""] = body.split(".");
  if (fracPart.length > SCALE) throw new Error(`amount scale > ${SCALE}`);
  const padded = (fracPart + "0".repeat(SCALE)).slice(0, SCALE);
  const scaled = BigInt(wholePart + padded);
  return neg ? -scaled : scaled;
}

function formatAmount(n: bigint): string {
  const neg = n < BigInt(0);
  const abs = n < BigInt(0) ? -n : n;
  const s = abs.toString().padStart(SCALE + 1, "0");
  const whole = s.slice(0, -SCALE) || "0";
  let frac = s.slice(-SCALE);
  while (frac.endsWith("0")) frac = frac.slice(0, -1);
  const body = frac.length ? `${whole}.${frac}` : whole;
  return neg ? `-${body}` : body;
}

export function parsePhotoLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseMemberIdLines(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(/[\s,]+/)) {
    const id = part.trim().toLowerCase();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function parsePositiveDecimal(
  raw: string,
  invalidMessage: string,
  nonPositiveMessage: string,
): AdminResult<string> {
  const amountRaw = raw.trim();
  if (!isDecimalAmount(amountRaw)) {
    return failure(400, "INVALID_INPUT", invalidMessage);
  }
  try {
    const n = parseAmount(amountRaw);
    if (n <= BigInt(0)) return failure(400, "INVALID_INPUT", nonPositiveMessage);
    return { ok: true, status: 200, data: formatAmount(n) };
  } catch {
    return failure(400, "INVALID_INPUT", invalidMessage);
  }
}

export function validateOperatorProductDraft(
  input: {
    name: string;
    description: string;
    photos: string[];
    compositionQty: number | string;
    payoutAmount: string;
    requiredCapitalUsdt?: string;
    expectedProfitKrwApprox?: string;
    currency?: string;
    visibility: string;
    selectedMemberIds: string[];
    priceConfirmationMemo?: string;
  },
  opts?: { persist?: boolean },
): AdminResult<OperatorProductDraft> {
  const persist = opts?.persist !== false;
  const name = input.name.trim();
  if (!name) return failure(400, "INVALID_INPUT", "상품 이름을 적어 주세요.");
  const qty = Number(input.compositionQty);
  if (!Number.isInteger(qty) || qty < 1) {
    return failure(400, "INVALID_INPUT", "구성 수량은 1 이상 정수여야 해요.");
  }
  const payout = parsePositiveDecimal(
    input.payoutAmount,
    "정산 USDT는 0보다 큰 소수 문자열이어야 해요.",
    "정산 USDT는 0보다 커야 해요.",
  );
  if (!payout.ok) return payout;
  const capitalRaw = (input.requiredCapitalUsdt ?? "").trim();
  let requiredCapitalUsdt = "";
  if (persist || capitalRaw) {
    const capital = parsePositiveDecimal(
      capitalRaw,
      "필요자본 USDT는 0보다 큰 소수 문자열이어야 해요.",
      "필요자본 USDT는 0보다 커야 해요.",
    );
    if (!capital.ok) return capital;
    requiredCapitalUsdt = capital.data;
  }
  const krwRaw = (input.expectedProfitKrwApprox ?? "").trim();
  let expectedProfitKrwApprox: string | undefined;
  if (krwRaw) {
    const krw = parsePositiveDecimal(
      krwRaw,
      "표시 원은 비우거나 0보다 큰 값만 보낼 수 있어요.",
      "표시 원은 0을 보내지 않아요. 비우면 이 칸은 생략해요.",
    );
    if (!krw.ok) {
      if (!persist) {
        expectedProfitKrwApprox = undefined;
      } else {
        return krw;
      }
    } else {
      expectedProfitKrwApprox = krw.data;
    }
  }
  const currency = (input.currency || PRODUCT_CURRENCY).trim();
  if (currency !== PRODUCT_CURRENCY) {
    return failure(400, "INVALID_INPUT", "통화는 USDT만 쓸 수 있어요.");
  }
  if (!isProductVisibility(input.visibility)) {
    return failure(400, "INVALID_INPUT", "공개 범위 값이 올바르지 않아요.");
  }
  const selectedMemberIds =
    input.visibility === "selected_members"
      ? input.selectedMemberIds.map((id) => id.trim().toLowerCase()).filter(Boolean)
      : [];
  if (input.visibility === "selected_members") {
    if (selectedMemberIds.length < 1) {
      return failure(400, "INVALID_INPUT", "선택 공개는 회원 번호가 하나 이상 필요해요.");
    }
    if (selectedMemberIds.some((id) => !isUuid(id))) {
      return failure(400, "INVALID_INPUT", "선택 공개 회원 번호는 정확한 UUID여야 해요.");
    }
  }
  const memoRaw = input.priceConfirmationMemo;
  if (memoRaw != null && typeof memoRaw !== "string") {
    return failure(400, "INVALID_INPUT", "가격 확인 메모는 문자열이어야 해요.");
  }
  const priceConfirmationMemo = (memoRaw ?? "").trim();
  if (priceConfirmationMemo.length > MEMO_MAX) {
    return failure(400, "INVALID_INPUT", "가격 확인 메모가 너무 길어요.");
  }
  return {
    ok: true,
    status: 200,
    data: {
      name,
      description: input.description.trim(),
      photos: input.photos.map((p) => p.trim()).filter(Boolean),
      compositionQty: qty,
      payoutAmount: payout.data,
      requiredCapitalUsdt,
      ...(expectedProfitKrwApprox ? { expectedProfitKrwApprox } : {}),
      currency: PRODUCT_CURRENCY,
      visibility: input.visibility,
      selectedMemberIds,
      priceConfirmationMemo,
    },
  };
}

export function persistBodyFromDraft(draft: OperatorProductDraft): OperatorProductDraft {
  const krwRaw = (draft.expectedProfitKrwApprox ?? "").trim();
  let expectedProfitKrwApprox: string | undefined;
  if (krwRaw) {
    const krw = parsePositiveDecimal(krwRaw, "", "");
    if (krw.ok) expectedProfitKrwApprox = krw.data;
  }
  return {
    name: draft.name,
    description: draft.description,
    photos: [...draft.photos],
    compositionQty: draft.compositionQty,
    payoutAmount: draft.payoutAmount,
    requiredCapitalUsdt: draft.requiredCapitalUsdt,
    ...(expectedProfitKrwApprox ? { expectedProfitKrwApprox } : {}),
    currency: draft.currency,
    visibility: draft.visibility,
    selectedMemberIds: [...draft.selectedMemberIds],
    priceConfirmationMemo: draft.priceConfirmationMemo,
  };
}

/** 설정 지급액만 persist. 메모·기준액·실지급 주장은 넣지 않는다. */
export function productMoneyLines(draft: OperatorProductDraft, incoming?: unknown): string[] {
  const fromResponse = incoming === undefined ? null : readMoneyAuthority(incoming);
  const auth = fromResponse ?? moneyFromConfiguredPayout(draft.payoutAmount);
  return moneyDisplayLines(auth);
}

export function visibilityLabelKo(value: ProductVisibility): string {
  if (value === "all_public") return "모든 회원에게 공개";
  if (value === "selected_members") return "선택한 회원에게만 공개";
  return "비공개";
}
