"use client";

import type { AdminFailureCode, AdminResult } from "../../lib/admin/errors";
import { isPayoutComplete, moneyDisplayLines, type MoneyAuthority } from "../../lib/admin/money-authority";
import type { ConfirmDraft } from "../../lib/admin/types";

export type Tone = "green" | "amber" | "red" | "blue" | "gray";

export function Badge({ tone = "gray", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Stat({
  label,
  value,
  detail,
  tone = "gray",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: Tone;
}) {
  return (
    <div className="stat">
      <span>
        {label}
        <i className={`dot dot-${tone}`} />
      </span>
      <b>{value}</b>
      <small>{detail}</small>
    </div>
  );
}

export function UnknownStat({ label, detail }: { label: string; detail?: string }) {
  return <Stat label={label} value="확인할 수 없음" detail={detail ?? "추측 숫자로 채우지 않았어요."} tone="amber" />;
}

export function DraftBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="ops-banner ops-banner-draft">
      <b>아직 연결되지 않음</b>
      <p>{children}</p>
    </div>
  );
}

export function WaitBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="ops-banner ops-banner-wait">
      <b>연결 대기</b>
      <p>{children}</p>
    </div>
  );
}

export function QaBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="ops-banner ops-banner-qa">
      <b>격리 시험</b>
      <p>{children}</p>
    </div>
  );
}

export function ResultBanner({
  result,
}: {
  result: AdminResult<unknown> | null;
}) {
  if (!result || result.ok) return null;
  return (
    <div className={`ops-banner ${bannerClass(result.code)}`} data-testid="ops-result-banner" data-code={result.code}>
      <b>{titleFor(result.code)}</b>
      <p>{result.message}</p>
    </div>
  );
}

function bannerClass(code: AdminFailureCode): string {
  if (code === "STORE_UNREADY" || code === "CONNECTION_WAITING") return "ops-banner-wait";
  if (code === "ADMIN_CAPABILITY_DENIED" || code === "NOT_FOUND" || code === "REVISION_CONFLICT") {
    return "ops-banner-alert";
  }
  return "ops-banner-alert";
}

function titleFor(code: AdminFailureCode): string {
  if (code === "STORE_UNREADY") return "준비 중";
  if (code === "CONNECTION_WAITING") return "연결 대기";
  if (code === "ADMIN_CAPABILITY_DENIED") return "권한 없음";
  if (code === "ADMIN_AUTH_REQUIRED" || code === "ADMIN_AUTH_INVALID") return "로그인 필요";
  if (code === "ADMIN_CSRF_INVALID") return "보안 확인 실패";
  if (code === "NOT_FOUND") return "찾을 수 없음";
  if (code === "REVISION_CONFLICT") return "다른 직원이 먼저 저장함";
  if (code === "UNKNOWN_UNAVAILABLE") return "결과를 확인할 수 없음";
  if (code === "USER_MISMATCH") return "다른 회원 응답";
  return "처리하지 않음";
}

export function ConfirmDialog({
  draft,
  busy,
  close,
  confirm,
}: {
  draft: ConfirmDraft;
  busy: boolean;
  close: () => void;
  confirm: () => void;
}) {
  return (
    <div className="backdrop" onMouseDown={close}>
      <div className="dialog" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <h2>{draft.title}</h2>
        <p>바뀌는 내용을 다시 본 뒤에만 진행해 주세요. 서버가 확인하기 전에는 완료가 아닙니다.</p>
        <div className="summary">
          <span>대상</span>
          <b>{draft.targetLabel}</b>
          <span>지금</span>
          <b>{draft.currentLabel}</b>
          <span>변경</span>
          <b>{draft.nextLabel}</b>
          <span>영향</span>
          <b>{draft.impact}</b>
          <span>사유</span>
          <b>{draft.reason}</b>
        </div>
        <div className="dialogactions">
          <button type="button" data-testid="confirm-cancel" onClick={close} disabled={busy}>
            취소
          </button>
          <button type="button" className="primary" data-testid="confirm-ok" onClick={confirm} disabled={busy}>
            {busy ? "결과 확인 중…" : "네, 진행합니다"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="ops-field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function MoneyAuthorityBlock({
  auth,
  testId = "money-authority",
}: {
  auth: MoneyAuthority | null;
  testId?: string;
}) {
  const complete = isPayoutComplete(auth);
  return (
    <pre className="ops-history" data-testid={testId} data-payout-complete={complete ? "true" : "false"}>
      {moneyDisplayLines(auth).join("\n")}
    </pre>
  );
}

export function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "확인할 수 없음";
  return `${value}회`;
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `qa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
