"use client";

import { useEffect, useState } from "react";
import { COPY } from "../../lib/admin/copy";
import { navHref } from "../../lib/admin-routes";
import type { AdminOpsPort, DepositConfigPatchBody, DepositConfigView, KrwDepositItem, WithdrawIntentItem } from "../../lib/admin/types";
import { Field, ResultBanner, newIdempotencyKey } from "./shared";

const EMPTY_PATCH: DepositConfigPatchBody = {
  changeReason: "",
  krw: { bankName: "", accountNumber: "", accountHolder: "", noticeKo: "", krwWithdrawFeeKrw: 0 },
  usdtOnchain: {
    tronGridBaseUrl: "",
    hotWalletXpubRef: "",
    treasuryHotAddressRef: "",
    energyDelegateEnabled: true,
    usdtWithdrawNetworkFeeUsdt: "",
    minTrxStakeForSweeper: "",
    sweeperPaused: false,
  },
  withdrawGuards: { minHoldingHours: 24 },
  pricingGuards: { priceStaleMaxSec: 3 },
};

function fromView(view: DepositConfigView): DepositConfigPatchBody {
  return {
    changeReason: "",
    krw: { ...view.krw },
    usdtOnchain: {
      tronGridBaseUrl: view.usdtOnchain.tronGridBaseUrl,
      hotWalletXpubRef: view.usdtOnchain.hotWalletXpubRef,
      treasuryHotAddressRef: view.usdtOnchain.treasuryHotAddressRef,
      energyDelegateEnabled: view.usdtOnchain.energyDelegateEnabled,
      usdtWithdrawNetworkFeeUsdt: view.usdtOnchain.usdtWithdrawNetworkFeeUsdt,
      minTrxStakeForSweeper: view.usdtOnchain.minTrxStakeForSweeper,
      sweeperPaused: view.usdtOnchain.sweeperPaused,
    },
    withdrawGuards: { ...view.withdrawGuards },
    pricingGuards: { priceStaleMaxSec: view.pricingGuards.priceStaleMaxSec },
  };
}

export function DepositGuideScreen({
  adapter,
  notify,
}: {
  adapter: AdminOpsPort;
  notify: (s: string, ok?: boolean) => void;
}) {
  const [form, setForm] = useState<DepositConfigPatchBody>(EMPTY_PATCH);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<AdminOpsPort["getDepositConfig"]>> | null>(null);

  useEffect(() => {
    void adapter.getDepositConfig().then((res) => {
      setResult(res);
      if (res.ok) {
        setMissing(false);
        setForm(fromView(res.data));
        return;
      }
      setMissing(res.code === "CONFIG_NOT_READY");
      if (res.code === "CONFIG_NOT_READY") setForm(EMPTY_PATCH);
    });
  }, [adapter]);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    const res = await adapter.patchDepositConfig(form);
    setBusy(false);
    setResult(res);
    if (!res.ok) {
      notify("입금 안내를 저장하지 않았어요.", false);
      return;
    }
    setMissing(false);
    setForm(fromView(res.data));
    notify("입금 안내를 저장했어요.", true);
  };

  return (
    <section className="panel" data-testid="deposit-guide">
      <div className="panelhead">
        <div>
          <h2>입금 안내</h2>
          <p>{COPY.depositGuideHelp}</p>
        </div>
      </div>
      <ResultBanner result={result && !result.ok && result.code !== "CONFIG_NOT_READY" ? result : null} />
      {missing ? (
        <p className="ops-hint">아직 저장된 안내가 없어요. 은행 칸을 직접 채운 뒤 첫 줄을 저장하세요.</p>
      ) : null}
      <div className="ops-form">
        <Field label="은행 이름">
          <input
            data-testid="deposit-bank-name"
            value={form.krw.bankName}
            onChange={(e) => setForm({ ...form, krw: { ...form.krw, bankName: e.target.value } })}
            placeholder="직접 입력"
            autoComplete="off"
          />
        </Field>
        <Field label="계좌 번호" hint="가짜 숫자를 채워 두지 않습니다.">
          <input
            data-testid="deposit-account-number"
            value={form.krw.accountNumber}
            onChange={(e) => setForm({ ...form, krw: { ...form.krw, accountNumber: e.target.value } })}
            placeholder="직접 입력"
            autoComplete="off"
          />
        </Field>
        <Field label="예금주">
          <input
            data-testid="deposit-account-holder"
            value={form.krw.accountHolder}
            onChange={(e) => setForm({ ...form, krw: { ...form.krw, accountHolder: e.target.value } })}
            placeholder="직접 입력"
            autoComplete="off"
          />
        </Field>
        <Field label="안내 문구">
          <textarea
            data-testid="deposit-notice"
            value={form.krw.noticeKo}
            onChange={(e) => setForm({ ...form, krw: { ...form.krw, noticeKo: e.target.value } })}
          />
        </Field>
        <Field label="원 출금 수수료">
          <input
            type="number"
            min={0}
            value={form.krw.krwWithdrawFeeKrw}
            onChange={(e) =>
              setForm({ ...form, krw: { ...form.krw, krwWithdrawFeeKrw: Number(e.target.value || 0) } })
            }
          />
        </Field>
        <Field label="트론 조회 주소">
          <input
            value={form.usdtOnchain.tronGridBaseUrl}
            onChange={(e) => setForm({ ...form, usdtOnchain: { ...form.usdtOnchain, tronGridBaseUrl: e.target.value } })}
            placeholder="https://api.trongrid.io"
          />
        </Field>
        <Field label="핫월렛 비밀 참조" hint="실제 비밀 이름만 적습니다. 공유 USDT 주소가 아닙니다.">
          <input
            value={form.usdtOnchain.hotWalletXpubRef}
            onChange={(e) => setForm({ ...form, usdtOnchain: { ...form.usdtOnchain, hotWalletXpubRef: e.target.value } })}
          />
        </Field>
        <Field label="금고 주소 참조">
          <input
            value={form.usdtOnchain.treasuryHotAddressRef}
            onChange={(e) =>
              setForm({ ...form, usdtOnchain: { ...form.usdtOnchain, treasuryHotAddressRef: e.target.value } })
            }
          />
        </Field>
        <Field label="USDT 출금 네트워크 수수료">
          <input
            value={form.usdtOnchain.usdtWithdrawNetworkFeeUsdt}
            onChange={(e) =>
              setForm({ ...form, usdtOnchain: { ...form.usdtOnchain, usdtWithdrawNetworkFeeUsdt: e.target.value } })
            }
          />
        </Field>
        <Field label="스위퍼 최소 TRX">
          <input
            value={form.usdtOnchain.minTrxStakeForSweeper}
            onChange={(e) =>
              setForm({ ...form, usdtOnchain: { ...form.usdtOnchain, minTrxStakeForSweeper: e.target.value } })
            }
          />
        </Field>
        <Field label="변경 이유" hint="10자 이상">
          <input
            data-testid="deposit-reason"
            value={form.changeReason}
            onChange={(e) => setForm({ ...form, changeReason: e.target.value })}
          />
        </Field>
        <button className="primary" type="button" data-testid="deposit-guide-save" disabled={busy} onClick={() => void save()}>
          {busy ? "저장 중…" : "입금 안내 저장"}
        </button>
      </div>
    </section>
  );
}

export function KrwDepositQueue({
  adapter,
  notify,
}: {
  adapter: AdminOpsPort;
  notify: (s: string, ok?: boolean) => void;
}) {
  const [items, setItems] = useState<KrwDepositItem[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await adapter.listKrwDeposits("pending");
    setItems(res.ok ? res.data.items : []);
  };

  useEffect(() => {
    void load();
  }, [adapter]);

  const decide = async (id: string, decision: "approve" | "reject") => {
    if (busy) return;
    setBusy(true);
    const res = await adapter.decideKrwDeposit(id, decision, {
      idempotencyKey: newIdempotencyKey(),
      reason: decision === "reject" ? "운영자가 입금을 거절했습니다." : undefined,
    });
    setBusy(false);
    notify(res.ok ? (decision === "approve" ? "입금을 확인했어요." : "입금을 거절했어요.") : "처리하지 않았어요.", res.ok);
    await load();
  };

  return (
    <section className="panel" data-testid="krw-deposit-queue">
      <div className="panelhead">
        <div>
          <h2>입금 확인</h2>
          <p>대기 중인 원 입금만 보여 줍니다. 환율 칸은 없습니다.</p>
        </div>
      </div>
      {items == null ? (
        <p className="ops-hint">불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="empty-box">
          <b>확인할 입금이 없어요</b>
          <p>가짜 대기열을 만들지 않았어요.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>회원</th>
                <th>입금액</th>
                <th>입금자</th>
                <th>시각</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>
                    <a href={navHref(`/users/${row.userId}`)}>{row.userId.slice(0, 8)}…</a>
                  </td>
                  <td>{row.requestedAmountKrw.toLocaleString("ko-KR")}원</td>
                  <td>{row.depositorName || "—"}</td>
                  <td>{row.createdAt ? new Date(row.createdAt).toLocaleString("ko-KR") : "—"}</td>
                  <td className="ops-actions">
                    <button type="button" disabled={busy} onClick={() => void decide(row.id, "approve")}>
                      확인
                    </button>
                    <button type="button" disabled={busy} onClick={() => void decide(row.id, "reject")}>
                      거절
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function WithdrawQueue({
  adapter,
  notify,
}: {
  adapter: AdminOpsPort;
  notify: (s: string, ok?: boolean) => void;
}) {
  const [items, setItems] = useState<WithdrawIntentItem[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await adapter.listWithdrawIntents();
    setItems(res.ok ? res.data.items : []);
  };

  useEffect(() => {
    void load();
  }, [adapter]);

  const decide = async (id: string, decision: "approve" | "reject") => {
    if (busy) return;
    setBusy(true);
    const res = await adapter.decideWithdraw(id, decision, {
      reason: decision === "approve" ? "운영자가 출금을 승인했습니다." : "운영자가 출금을 거절했습니다.",
      idempotencyKey: newIdempotencyKey(),
    });
    setBusy(false);
    notify(res.ok ? (decision === "approve" ? "출금을 승인했어요." : "출금을 거절했어요.") : "처리하지 않았어요.", res.ok);
    await load();
  };

  return (
    <section className="panel" data-testid="withdraw-queue">
      <div className="panelhead">
        <div>
          <h2>출금 요청</h2>
          <p>검수 대기 출금만 보여 줍니다.</p>
        </div>
      </div>
      {items == null ? (
        <p className="ops-hint">불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="empty-box">
          <b>대기 출금이 없어요</b>
          <p>가짜 요청을 만들지 않았어요.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>회원</th>
                <th>금액</th>
                <th>자산</th>
                <th>받는 곳</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>
                    <a href={navHref(`/users/${row.userId}`)}>{row.userId.slice(0, 8)}…</a>
                  </td>
                  <td>{row.amountUsdt}</td>
                  <td>{row.asset}</td>
                  <td>{row.destination || "—"}</td>
                  <td className="ops-actions">
                    <button type="button" disabled={busy} onClick={() => void decide(row.id, "approve")}>
                      승인
                    </button>
                    <button type="button" disabled={busy} onClick={() => void decide(row.id, "reject")}>
                      거절
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
