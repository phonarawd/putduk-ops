/**
 * 금액 권위 표시. 백엔드 money-authority.core.cjs 와 같은 규칙.
 * 예상액·설정 지급액·클라이언트 계산값을 실지급으로 쓰지 않는다.
 */

import { asRecord, readString } from "./errors.ts";

export type MoneyAuthority = {
  expectedProfitUsdt: string | null;
  configuredPayoutUsdt: string | null;
  ledgerPaidUsdt: string | null;
  ledgerJournalId: string | null;
  payoutAuthoritative: boolean;
  clientComputedNotAuthority: true;
};

function nonempty(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value);
  return s !== "" ? s : null;
}

export function projectMoneyAuthority(input: {
  expectedProfitUsdt?: string | null;
  configuredPayoutUsdt?: string | null;
  ledgerPaidUsdt?: string | null;
  ledgerJournalId?: string | null;
  clientComputedUsdt?: string | null;
}): MoneyAuthority {
  const expected = nonempty(input.expectedProfitUsdt);
  const configured = nonempty(input.configuredPayoutUsdt);
  const journalId = nonempty(input.ledgerJournalId);
  const paidRaw = nonempty(input.ledgerPaidUsdt);
  const clientClaim = input.clientComputedUsdt != null && String(input.clientComputedUsdt) !== "";
  const ledgerPaidUsdt = journalId && paidRaw ? paidRaw : null;
  return {
    expectedProfitUsdt: expected,
    configuredPayoutUsdt: configured,
    ledgerPaidUsdt,
    ledgerJournalId: journalId,
    payoutAuthoritative: Boolean(journalId && ledgerPaidUsdt) && !clientClaim,
    clientComputedNotAuthority: true,
  };
}

function hasMoneyKeys(rec: Record<string, unknown>): boolean {
  return (
    "expectedProfitUsdt" in rec ||
    "configuredPayoutUsdt" in rec ||
    "ledgerPaidUsdt" in rec ||
    "ledgerJournalId" in rec ||
    "payoutAuthoritative" in rec ||
    "moneyAuthority" in rec
  );
}

/** 응답에 금액 권위가 없으면 null. 빈 객체·저널 없는 지급 주장은 완료가 아니다. */
export function readMoneyAuthority(row: unknown): MoneyAuthority | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const nested = asRecord(rec.moneyAuthority);
  const source = nested ?? (hasMoneyKeys(rec) && !nested ? rec : null);
  if (!source) return null;
  return projectMoneyAuthority({
    expectedProfitUsdt: readString(source.expectedProfitUsdt),
    configuredPayoutUsdt: readString(source.configuredPayoutUsdt),
    ledgerPaidUsdt: readString(source.ledgerPaidUsdt),
    ledgerJournalId: readString(source.ledgerJournalId),
    clientComputedUsdt: readString(source.clientComputedUsdt),
  });
}

export function isPayoutComplete(auth: MoneyAuthority | null): boolean {
  return (
    auth != null &&
    auth.payoutAuthoritative === true &&
    Boolean(auth.ledgerJournalId && auth.ledgerPaidUsdt)
  );
}

export function moneyDisplayLines(auth: MoneyAuthority | null): string[] {
  if (!auth) {
    return [
      "예상액: 확인 불가",
      "설정 지급액: 확인 불가",
      "실지급: 확인 불가",
      "지급 완료 아님 · 금액 권위 필드 없음",
    ];
  }
  return [
    `예상액: ${auth.expectedProfitUsdt ?? "확인 불가"}`,
    `설정 지급액: ${auth.configuredPayoutUsdt ?? "확인 불가"}`,
    isPayoutComplete(auth)
      ? `실지급: ${auth.ledgerPaidUsdt} · 원장 ${auth.ledgerJournalId}`
      : "실지급: 확인 불가 · 지급 완료 아님",
  ];
}

export function moneyFromConfiguredPayout(amount: string): MoneyAuthority {
  return projectMoneyAuthority({ configuredPayoutUsdt: amount });
}
