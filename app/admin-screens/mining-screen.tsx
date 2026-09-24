"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { navHref } from "../../lib/admin-routes";
import {
  POSITION_STATUS_LABELS,
  SETTLEMENT_STATUS_LABELS,
  mineStatusLabel,
  miningAdmin,
  miningFailureMessage,
  positionStatusLabel,
  rateStatusLabel,
  settlementStatusLabel,
  highValueStatusLabel,
  type HighValueReview,
  type MineDetail,
  type MineSummary,
  type MiningSwitch,
  type PositionDetail,
  type PositionSummary,
  type RateVersion,
  type SettlementDetail,
  type SettlementSummary,
} from "../../lib/admin/mining";

const MINING_SWITCHES = [
  {
    id: "MINING_NEW_POSITIONS_PAUSE" as const,
    label: "전체 신규 운용 중지",
    description: "새 운용 시작만 전체적으로 막습니다.",
  },
  {
    id: "MINING_SETTLEMENT_PAUSE" as const,
    label: "정산 보류",
    description: "정산과 정산이 필요한 운용 변경을 보류합니다.",
  },
];

type Notify = (message: string, ok?: boolean) => void;

type Props = {
  route: string;
  adminId?: string;
  notify: Notify;
};

export function MiningScreen({ route, adminId, notify }: Props) {
  if (route === "/" || route === "/mine/today") return <MiningToday />;
  if (route === "/mine/mines") return <MineManagement notify={notify} />;
  if (route === "/mine/rates") return <RateManagement adminId={adminId} notify={notify} />;
  if (route === "/mine/positions") return <PositionManagement />;
  if (route === "/mine/settlements") return <SettlementManagement notify={notify} />;
  if (route === "/mine/high-value") return <HighValueManagement notify={notify} />;
  if (route === "/mine/system") return <MiningSystemControl notify={notify} />;
  return null;
}

function MiningToday() {
  const [mines, setMines] = useState<MineSummary[] | null>(null);
  const [failed, setFailed] = useState<SettlementSummary[] | null>(null);
  const [review, setReview] = useState<SettlementSummary[] | null>(null);
  const [approvalCount, setApprovalCount] = useState<number | null>(null);
  const [highValuePending, setHighValuePending] = useState<HighValueReview[] | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    const [mineRes, failedRes, reviewRes, highValueRes] = await Promise.all([
      miningAdmin.listMines(),
      miningAdmin.listSettlements({ status: "FAILED", limit: 100 }),
      miningAdmin.listSettlements({ status: "REVIEW_REQUIRED", limit: 100 }),
      miningAdmin.listHighValueReviews({ status: "PENDING", limit: 100 }),
    ]);

    if (!mineRes.ok) {
      setMines([]);
      setFailed(failedRes.ok ? failedRes.data.items : []);
      setReview(reviewRes.ok ? reviewRes.data.items : []);
      setApprovalCount(0);
      setHighValuePending(highValueRes.ok ? highValueRes.data.items : []);
      setError(miningFailureMessage(mineRes));
      return;
    }

    setMines(mineRes.data.items);
    setFailed(failedRes.ok ? failedRes.data.items : []);
    setReview(reviewRes.ok ? reviewRes.data.items : []);
    setHighValuePending(highValueRes.ok ? highValueRes.data.items : []);

    const rateResults = await Promise.all(
      mineRes.data.items.map((mine) => miningAdmin.listRates(mine.mineId)),
    );
    let pending = 0;
    for (const result of rateResults) {
      if (!result.ok) continue;
      pending += result.data.items.filter(
        (rate) => rate.status === "APPROVAL_PENDING" && !rate.approvedAt,
      ).length;
    }
    setApprovalCount(pending);
  };

  useEffect(() => {
    void load();
  }, []);

  const loading = mines == null || failed == null || review == null || approvalCount == null || highValuePending == null;
  const settlementAttention = (failed?.length ?? 0) + (review?.length ?? 0);

  return (
    <div className="mine-stack" data-testid="mine-today">
      <section className="mine-hero">
        <div>
          <small>PUTDUK MINE OS</small>
          <h2>오늘 할 일</h2>
          <p>입출금, 본인 확인, 정산 이상, 수익률 승인을 운영 API 기준으로 확인합니다.</p>
        </div>
        <button
          type="button"
          className="mine-button mine-button-ghost"
          onClick={() => void load()}
          disabled={loading}
        >
          새로고침
        </button>
      </section>

      {error ? <MineError message={error} /> : null}

      <div className="mine-task-grid">
        <TaskCard href="/money/deposits" label="입금" value="대기열 열기" note="기존 입금 운영 화면" />
        <TaskCard href="/money/withdrawals" label="출금" value="대기열 열기" note="기존 출금 운영 화면" />
        <TaskCard href="/identity" label="KYC" value="대기열 열기" note="기존 본인 확인 화면" />
        <TaskCard
          href="/mine/high-value"
          label="고액운용"
          value={loading ? "확인 중" : `${highValuePending?.length ?? 0}건`}
          note="승인 또는 거절이 필요한 검토 요청"
          alert={(highValuePending?.length ?? 0) > 0}
        />
        <TaskCard
          href="/mine/settlements"
          label="정산 오류"
          value={loading ? "확인 중" : `${settlementAttention}건`}
          note={`실패 ${failed?.length ?? 0} · 검토필요 ${review?.length ?? 0}`}
          alert={settlementAttention > 0}
        />
        <TaskCard
          href="/mine/rates"
          label="수익률 승인"
          value={loading ? "확인 중" : `${approvalCount ?? 0}건`}
          note="다른 운영자의 승인이 필요한 요청"
          alert={(approvalCount ?? 0) > 0}
        />
      </div>

      <section className="panel">
        <div className="panelhead">
          <div>
            <h2>광산 운영 요약</h2>
            <p>가동 상태와 활성 운용 수를 실제 광산 API에서 집계합니다.</p>
          </div>
        </div>
        {mines == null ? (
          <p className="ops-hint">불러오는 중…</p>
        ) : mines.length === 0 ? (
          <MineEmpty title="등록된 광산이 없습니다" body="광산 관리에서 첫 광산을 만들 수 있습니다." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>광산</th><th>자산</th><th>상태</th><th>전체 운용</th><th>운용 중</th></tr>
              </thead>
              <tbody>
                {mines.map((mine) => (
                  <tr key={mine.mineId}>
                    <td><b>{mine.displayName}</b><small className="mine-cell-note">{mine.code}</small></td>
                    <td>{mine.assetCode}</td>
                    <td><MineStatus status={mine.status} kind="mine" /></td>
                    <td>{mine.positionCount ?? 0}</td>
                    <td>{mine.activePositionCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function TaskCard({
  href,
  label,
  value,
  note,
  muted,
  alert,
}: {
  href?: string;
  label: string;
  value: string;
  note: string;
  muted?: boolean;
  alert?: boolean;
}) {
  const content = <><span>{label}</span><strong>{value}</strong><small>{note}</small></>;
  const className = `mine-task-card${muted ? " is-muted" : ""}${alert ? " is-alert" : ""}`;
  if (!href) return <div className={className}>{content}</div>;
  return <Link className={className} href={navHref(href)}>{content}</Link>;
}

function HighValueManagement({ notify }: { notify: Notify }) {
  const [items, setItems] = useState<HighValueReview[] | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("고액운용 검토 정책에 따른 판단입니다.");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selected = useMemo(
    () => items?.find((item) => item.reviewId === selectedId) ?? null,
    [items, selectedId],
  );

  const load = async () => {
    setError("");
    const res = await miningAdmin.listHighValueReviews({ status: "PENDING", limit: 100 });
    if (!res.ok) {
      setItems([]);
      setError(miningFailureMessage(res));
      return;
    }
    setItems(res.data.items);
    if (selectedId && res.data.items.some((item) => item.reviewId === selectedId)) return;
    setSelectedId(res.data.items[0]?.reviewId ?? "");
  };

  useEffect(() => {
    void load();
  }, []);

  const decide = async (decision: "approve" | "reject") => {
    if (!selected || busy) return;
    if (reason.trim().length < 8) {
      const message = "사유를 8자 이상 입력해 주세요.";
      setError(message);
      notify(message, false);
      return;
    }

    setBusy(true);
    setError("");
    const res = decision === "approve"
      ? await miningAdmin.approveHighValueReview(selected.reviewId, reason.trim())
      : await miningAdmin.rejectHighValueReview(selected.reviewId, reason.trim());
    setBusy(false);

    if (!res.ok) {
      const message = miningFailureMessage(res);
      setError(message);
      notify(message, false);
      return;
    }

    notify(decision === "approve" ? "고액운용 요청을 승인했습니다." : "고액운용 요청을 거절했습니다.");
    await load();
  };

  return (
    <div className="mine-stack">
      <section className="mine-hero">
        <div>
          <small>HIGH VALUE CONTROL</small>
          <h2>고액운용 검토</h2>
          <p>Backend가 생성한 검토 요청만 표시합니다. 승인·거절 결과가 최종 판단입니다.</p>
        </div>
        <button type="button" className="mine-button mine-button-ghost" onClick={() => void load()} disabled={busy}>
          새로고침
        </button>
      </section>

      {error ? <MineError message={error} /> : null}

      {items == null ? (
        <section className="panel"><p className="ops-hint">검토 요청을 불러오는 중…</p></section>
      ) : items.length === 0 ? (
        <section className="panel"><MineEmpty title="대기 중인 고액운용 요청이 없습니다" body="새 검토 요청이 생기면 이 화면에 표시됩니다." /></section>
      ) : (
        <div className="mine-two-col">
          <section className="panel">
            <div className="panelhead">
              <div>
                <h2>검토 대기열</h2>
                <p>{items.length}건</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>광산</th><th>요청 금액</th><th>기준 금액</th><th>요청 시각</th><th>상태</th></tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.reviewId}
                      onClick={() => setSelectedId(item.reviewId)}
                      style={{ cursor: "pointer" }}
                      aria-selected={selectedId === item.reviewId}
                    >
                      <td><b>{item.mineName ?? item.mineCode ?? "광산"}</b><small className="mine-cell-note">{shortId(item.reviewId)}</small></td>
                      <td>{formatMoney(item.requestedPrincipalUsdt)} USDT</td>
                      <td>{formatMoney(item.thresholdUsdt)} USDT</td>
                      <td>{formatDate(item.requestedAt)}</td>
                      <td><span className="mine-status is-pending">{highValueStatusLabel(item.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panelhead">
              <div>
                <h2>검토 상세</h2>
                <p>선택한 요청의 서버 기준 정보를 확인합니다.</p>
              </div>
            </div>

            {!selected ? (
              <MineEmpty title="검토 요청을 선택하세요" body="왼쪽 대기열에서 요청을 선택하면 상세 정보가 표시됩니다." />
            ) : (
              <>
                <div className="mine-kv-grid">
                  <MineKv label="광산" value={selected.mineName ?? selected.mineCode ?? "광산"} />
                  <MineKv label="요청 금액" value={`${formatMoney(selected.requestedPrincipalUsdt)} USDT`} />
                  <MineKv label="검토 기준" value={`${formatMoney(selected.thresholdUsdt)} USDT`} />
                  <MineKv label="요청 시각" value={formatDate(selected.requestedAt)} />
                  <MineKv label="운용 포지션" value={shortId(selected.positionId)} />
                  <MineKv label="사용자" value={shortId(selected.userId)} />
                </div>

                <MineField label="검토 사유" wide>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={4}
                    placeholder="승인 또는 거절 사유"
                  />
                </MineField>

                <div className="mine-actions">
                  <button type="button" className="mine-button" onClick={() => void decide("approve")} disabled={busy}>
                    {busy ? "처리 중…" : "승인"}
                  </button>
                  <button type="button" className="mine-button mine-button-danger" onClick={() => void decide("reject")} disabled={busy}>
                    거절
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function MineManagement({ notify }: { notify: Notify }) {
  const [items, setItems] = useState<MineSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<MineDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("광산 운영 정책에 따른 변경입니다.");
  const [draftMine, setDraftMine] = useState({
    code: "",
    displayName: "",
    description: "",
    assetCode: "",
    minPrincipalAmount: "",
    maxPrincipalAmount: "",
    displayOrder: "0",
    reason: "신규 광산 운영 준비를 위한 생성입니다.",
  });
  const [edit, setEdit] = useState({
    displayName: "",
    description: "",
    minPrincipalAmount: "",
    maxPrincipalAmount: "",
    displayOrder: "0",
  });

  const loadDetail = async (mineId: string) => {
    setError("");
    const res = await miningAdmin.getMine(mineId);
    if (!res.ok) {
      setDetail(null);
      setError(miningFailureMessage(res));
      return;
    }
    setDetail(res.data);
    setEdit({
      displayName: res.data.displayName,
      description: res.data.description,
      minPrincipalAmount: res.data.minPrincipalAmount ?? "",
      maxPrincipalAmount: res.data.maxPrincipalAmount ?? "",
      displayOrder: String(res.data.displayOrder),
    });
  };

  const load = async (preferId?: string) => {
    const res = await miningAdmin.listMines();
    if (!res.ok) {
      setItems([]);
      setError(miningFailureMessage(res));
      return;
    }
    setItems(res.data.items);
    const nextId = preferId || selectedId || res.data.items[0]?.mineId || "";
    setSelectedId(nextId);
    if (nextId) await loadDetail(nextId);
    else setDetail(null);
  };

  useEffect(() => {
    void load();
  }, []);

  const createMine = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await miningAdmin.createMine({
      ...draftMine,
      displayOrder: Number(draftMine.displayOrder || 0),
    });
    setBusy(false);
    if (!res.ok) {
      const message = miningFailureMessage(res);
      setError(message);
      notify(message, false);
      return;
    }
    notify("광산을 생성했습니다.");
    setDraftMine({
      code: "",
      displayName: "",
      description: "",
      assetCode: "",
      minPrincipalAmount: "",
      maxPrincipalAmount: "",
      displayOrder: "0",
      reason: "신규 광산 운영 준비를 위한 생성입니다.",
    });
    await load(res.data.mineId);
  };

  const updateMine = async () => {
    if (!detail || busy) return;
    setBusy(true);
    setError("");
    const res = await miningAdmin.updateMine(detail.mineId, {
      ...edit,
      displayOrder: Number(edit.displayOrder || 0),
      reason,
    });
    setBusy(false);
    if (!res.ok) {
      const message = miningFailureMessage(res);
      setError(message);
      notify(message, false);
      return;
    }
    notify("광산 정보를 저장했습니다.");
    await load(detail.mineId);
  };

  const action = async (
    kind: "publish" | "pause-new-positions" | "pause" | "resume" | "end",
    label: string,
  ) => {
    if (!detail || busy) return;
    setBusy(true);
    setError("");
    const res = await miningAdmin.mineAction(detail.mineId, kind, reason);
    setBusy(false);
    if (!res.ok) {
      const message = miningFailureMessage(res);
      setError(message);
      notify(message, false);
      return;
    }
    notify(`${label} 처리가 완료되었습니다.`);
    await load(detail.mineId);
  };

  return (
    <div className="mine-stack" data-testid="mine-management">
      {error ? <MineError message={error} /> : null}

      <section className="panel">
        <div className="panelhead">
          <div><h2>광산 목록</h2><p>목록과 운용 수는 Nest 관리자 API의 현재 값입니다.</p></div>
          <button className="mine-button mine-button-ghost" type="button" onClick={() => void load()} disabled={busy}>새로고침</button>
        </div>
        {items == null ? (
          <p className="ops-hint">불러오는 중…</p>
        ) : items.length === 0 ? (
          <MineEmpty title="광산이 없습니다" body="아래 생성 영역에서 첫 광산을 등록하세요." />
        ) : (
          <div className="mine-list-grid">
            {items.map((mine) => (
              <button
                type="button"
                key={mine.mineId}
                className={`mine-list-card${selectedId === mine.mineId ? " is-selected" : ""}`}
                onClick={() => {
                  setSelectedId(mine.mineId);
                  void loadDetail(mine.mineId);
                }}
              >
                <span><b>{mine.displayName}</b><small>{mine.code} · {mine.assetCode}</small></span>
                <MineStatus status={mine.status} kind="mine" />
              </button>
            ))}
          </div>
        )}
      </section>

      {detail ? (
        <section className="panel">
          <div className="panelhead">
            <div><h2>{detail.displayName}</h2><p>{detail.code} · {detail.assetCode} · 원금 {detail.principalCurrency}</p></div>
            <MineStatus status={detail.status} kind="mine" />
          </div>
          <div className="mine-form-grid">
            <MineField label="광산명"><input value={edit.displayName} onChange={(e) => setEdit({ ...edit, displayName: e.target.value })} /></MineField>
            <MineField label="표시 순서"><input type="number" value={edit.displayOrder} onChange={(e) => setEdit({ ...edit, displayOrder: e.target.value })} /></MineField>
            <MineField label="최소 운용 USDT"><input inputMode="decimal" value={edit.minPrincipalAmount} onChange={(e) => setEdit({ ...edit, minPrincipalAmount: e.target.value })} /></MineField>
            <MineField label="최대 운용 USDT"><input inputMode="decimal" value={edit.maxPrincipalAmount} onChange={(e) => setEdit({ ...edit, maxPrincipalAmount: e.target.value })} /></MineField>
            <MineField label="설명" wide><textarea rows={3} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></MineField>
            <MineField label="변경 사유" wide><textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></MineField>
          </div>
          <div className="mine-actions">
            <button className="mine-button" type="button" disabled={busy} onClick={() => void updateMine()}>정보 저장</button>
            {detail.status === "READY" ? <button className="mine-button" type="button" disabled={busy} onClick={() => void action("publish", "공개")}>공개</button> : null}
            {detail.status === "ACTIVE" ? <button className="mine-button mine-button-ghost" type="button" disabled={busy} onClick={() => void action("pause-new-positions", "신규운용중지")}>신규운용중지</button> : null}
            {detail.status !== "PAUSED" && detail.status !== "ENDED" ? <button className="mine-button mine-button-danger" type="button" disabled={busy} onClick={() => void action("pause", "일시정지")}>일시정지</button> : null}
            {detail.status === "PAUSED" || detail.status === "NEW_POSITIONS_PAUSED" ? <button className="mine-button" type="button" disabled={busy} onClick={() => void action("resume", "재개")}>재개</button> : null}
            {detail.status !== "ENDED" ? <button className="mine-button mine-button-danger" type="button" disabled={busy} onClick={() => void action("end", "종료")}>종료</button> : null}
          </div>
          <p className="ops-hint">공개·재개에는 적용 가능한 승인 수익률이 필요하고, 열린 운용이 있으면 종료되지 않습니다. 최종 판단은 서버가 합니다.</p>
        </section>
      ) : null}

      <section className="panel">
        <div className="panelhead"><div><h2>새 광산 만들기</h2><p>생성 직후 상태는 준비입니다. 승인 수익률 없이 공개할 수 없습니다.</p></div></div>
        <div className="mine-form-grid">
          <MineField label="광산 코드"><input value={draftMine.code} onChange={(e) => setDraftMine({ ...draftMine, code: e.target.value.toUpperCase() })} placeholder="GOLD" /></MineField>
          <MineField label="자산 코드"><input value={draftMine.assetCode} onChange={(e) => setDraftMine({ ...draftMine, assetCode: e.target.value.toUpperCase() })} placeholder="XAU" /></MineField>
          <MineField label="광산명"><input value={draftMine.displayName} onChange={(e) => setDraftMine({ ...draftMine, displayName: e.target.value })} /></MineField>
          <MineField label="표시 순서"><input type="number" value={draftMine.displayOrder} onChange={(e) => setDraftMine({ ...draftMine, displayOrder: e.target.value })} /></MineField>
          <MineField label="최소 운용 USDT"><input inputMode="decimal" value={draftMine.minPrincipalAmount} onChange={(e) => setDraftMine({ ...draftMine, minPrincipalAmount: e.target.value })} /></MineField>
          <MineField label="최대 운용 USDT"><input inputMode="decimal" value={draftMine.maxPrincipalAmount} onChange={(e) => setDraftMine({ ...draftMine, maxPrincipalAmount: e.target.value })} /></MineField>
          <MineField label="설명" wide><textarea rows={3} value={draftMine.description} onChange={(e) => setDraftMine({ ...draftMine, description: e.target.value })} /></MineField>
          <MineField label="생성 사유" wide><textarea rows={2} value={draftMine.reason} onChange={(e) => setDraftMine({ ...draftMine, reason: e.target.value })} /></MineField>
        </div>
        <button
          className="mine-button"
          type="button"
          disabled={busy || !draftMine.code || !draftMine.displayName || !draftMine.assetCode || draftMine.reason.trim().length < 8}
          onClick={() => void createMine()}
        >
          광산 생성
        </button>
      </section>
    </div>
  );
}

function RateManagement({ adminId, notify }: { adminId?: string; notify: Notify }) {
  const [mines, setMines] = useState<MineSummary[] | null>(null);
  const [mineId, setMineId] = useState("");
  const [rates, setRates] = useState<RateVersion[] | null>(null);
  const [selectedRateId, setSelectedRateId] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [reason, setReason] = useState("수익률 운영 정책에 따른 변경입니다.");
  const [effectiveAt, setEffectiveAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selected = useMemo(
    () => rates?.find((rate) => rate.rateVersionId === selectedRateId) ?? null,
    [rates, selectedRateId],
  );

  const loadRates = async (id = mineId) => {
    if (!id) {
      setRates([]);
      return;
    }
    const res = await miningAdmin.listRates(id);
    if (!res.ok) {
      setRates([]);
      setError(miningFailureMessage(res));
      return;
    }
    setRates(res.data.items);
  };

  const loadMines = async () => {
    const res = await miningAdmin.listMines();
    if (!res.ok) {
      setMines([]);
      setError(miningFailureMessage(res));
      return;
    }
    setMines(res.data.items);
    const next = res.data.items[0]?.mineId ?? "";
    setMineId(next);
    if (next) await loadRates(next);
  };

  useEffect(() => {
    void loadMines();
  }, []);

  const selectRate = (rate: RateVersion) => {
    setSelectedRateId(rate.rateVersionId);
    setDailyRate(rate.dailyRate);
    setEffectiveAt("");
  };

  const finishRateMutation = async (
    res: Awaited<ReturnType<typeof miningAdmin.createRate>>,
    success: string,
  ) => {
    setBusy(false);
    if (!res.ok) {
      const message = miningFailureMessage(res);
      setError(message);
      notify(message, false);
      return;
    }
    notify(success);
    setSelectedRateId(res.data.rateVersionId);
    setDailyRate(res.data.dailyRate);
    await loadRates();
  };

  const createRate = async () => {
    if (!mineId || busy) return;
    setBusy(true);
    setError("");
    await finishRateMutation(
      await miningAdmin.createRate(mineId, dailyRate, reason),
      "수익률 초안을 만들었습니다.",
    );
  };

  const updateRate = async () => {
    if (!mineId || !selected || busy) return;
    setBusy(true);
    setError("");
    await finishRateMutation(
      await miningAdmin.updateRate(mineId, selected.rateVersionId, dailyRate, reason),
      "수익률 초안을 저장했습니다.",
    );
  };

  const rateAction = async (action: "request-approval" | "approve", success: string) => {
    if (!mineId || !selected || busy) return;
    setBusy(true);
    setError("");
    await finishRateMutation(
      await miningAdmin.rateAction(mineId, selected.rateVersionId, action, reason),
      success,
    );
  };

  const scheduleRate = async (applyNow: boolean) => {
    if (!mineId || !selected || busy) return;
    const when = applyNow
      ? new Date().toISOString()
      : effectiveAt
        ? new Date(effectiveAt).toISOString()
        : "";
    if (!when) {
      setError("적용 시각을 선택해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    await finishRateMutation(
      await miningAdmin.scheduleRate(mineId, selected.rateVersionId, when, reason),
      applyNow ? "승인 수익률을 적용했습니다." : "승인 수익률을 예약했습니다.",
    );
  };

  const makerIsMe = Boolean(
    selected?.createdByAdminId && adminId && selected.createdByAdminId === adminId,
  );

  return (
    <div className="mine-stack" data-testid="rate-management">
      {error ? <MineError message={error} /> : null}

      <section className="panel">
        <div className="panelhead"><div><h2>수익률 관리</h2><p>초안 → 승인요청 → 다른 운영자 승인 → 예약/적용 순서로 진행합니다.</p></div></div>
        <MineField label="광산">
          <select
            value={mineId}
            onChange={(e) => {
              const id = e.target.value;
              setMineId(id);
              setSelectedRateId("");
              setDailyRate("");
              void loadRates(id);
            }}
          >
            {(mines ?? []).map((mine) => <option key={mine.mineId} value={mine.mineId}>{mine.displayName} · {mine.code}</option>)}
          </select>
        </MineField>
        {mines?.length === 0 ? <MineEmpty title="광산이 없습니다" body="먼저 광산 관리에서 광산을 생성하세요." /> : null}
      </section>

      {mineId ? (
        <section className="panel">
          <div className="panelhead">
            <div><h2>수익률 이력</h2><p>서버가 저장한 버전, 상태, 적용 시각을 확인합니다.</p></div>
            <button className="mine-button mine-button-ghost" type="button" onClick={() => void loadRates()} disabled={busy}>새로고침</button>
          </div>
          {rates == null ? (
            <p className="ops-hint">불러오는 중…</p>
          ) : rates.length === 0 ? (
            <MineEmpty title="수익률 이력이 없습니다" body="첫 초안을 작성하세요." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>버전</th><th>일 수익률</th><th>상태</th><th>적용 시각</th><th>승인</th></tr></thead>
                <tbody>
                  {rates.map((rate) => (
                    <tr
                      key={rate.rateVersionId}
                      className={selectedRateId === rate.rateVersionId ? "mine-row-selected" : ""}
                      onClick={() => selectRate(rate)}
                    >
                      <td>v{rate.versionNo}</td>
                      <td>{formatRate(rate.dailyRate)}</td>
                      <td><MineStatus status={rate.status} kind="rate" /></td>
                      <td>{formatDate(rate.effectiveAt)}</td>
                      <td>{rate.approvedAt ? "승인됨" : rate.status === "APPROVAL_PENDING" ? "승인 대기" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {mineId ? (
        <section className="panel">
          <div className="panelhead">
            <div><h2>{selected ? `수익률 v${selected.versionNo}` : "새 수익률 초안"}</h2><p>{selected ? rateStatusLabel(selected.status) : "초안 작성"}</p></div>
            {selected ? <MineStatus status={selected.status} kind="rate" /> : null}
          </div>
          <div className="mine-form-grid">
            <MineField label="일 수익률 (비율)">
              <input inputMode="decimal" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} placeholder="0.001" disabled={Boolean(selected && selected.status !== "DRAFT")} />
              <small>예: 0.001 = 일 0.1%</small>
            </MineField>
            <MineField label="변경 사유"><input value={reason} onChange={(e) => setReason(e.target.value)} /></MineField>
            {selected?.approvedAt && selected.status === "APPROVAL_PENDING" ? (
              <MineField label="예약 적용 시각"><input type="datetime-local" value={effectiveAt} onChange={(e) => setEffectiveAt(e.target.value)} /></MineField>
            ) : null}
          </div>
          <div className="mine-actions">
            {!selected ? <button className="mine-button" type="button" disabled={busy || !dailyRate || reason.trim().length < 8} onClick={() => void createRate()}>초안 생성</button> : null}
            {selected?.status === "DRAFT" ? <><button className="mine-button mine-button-ghost" type="button" disabled={busy || !dailyRate || reason.trim().length < 8} onClick={() => void updateRate()}>초안 저장</button><button className="mine-button" type="button" disabled={busy || reason.trim().length < 8} onClick={() => void rateAction("request-approval", "승인을 요청했습니다.")}>승인 요청</button></> : null}
            {selected?.status === "APPROVAL_PENDING" && !selected.approvedAt ? <button className="mine-button" type="button" disabled={busy || makerIsMe || reason.trim().length < 8} onClick={() => void rateAction("approve", "수익률을 승인했습니다.")}>{makerIsMe ? "작성자는 승인할 수 없음" : "승인"}</button> : null}
            {selected?.status === "APPROVAL_PENDING" && selected.approvedAt ? <><button className="mine-button" type="button" disabled={busy || reason.trim().length < 8} onClick={() => void scheduleRate(true)}>지금 적용</button><button className="mine-button mine-button-ghost" type="button" disabled={busy || !effectiveAt || reason.trim().length < 8} onClick={() => void scheduleRate(false)}>예약</button></> : null}
            {selected ? <button className="mine-button mine-button-ghost" type="button" onClick={() => { setSelectedRateId(""); setDailyRate(""); setEffectiveAt(""); }}>새 초안</button> : null}
          </div>
          {selected?.createdByAdminId ? <p className="ops-hint">작성자와 승인자는 반드시 달라야 합니다. 화면과 서버가 동일 운영자의 승인을 막습니다.</p> : null}
        </section>
      ) : null}
    </div>
  );
}

function PositionManagement() {
  const [items, setItems] = useState<PositionSummary[] | null>(null);
  const [detail, setDetail] = useState<PositionDetail | null>(null);
  const [filters, setFilters] = useState({ mineId: "", userId: "", status: "" });
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    const res = await miningAdmin.listPositions(filters);
    if (!res.ok) {
      setItems([]);
      setError(miningFailureMessage(res));
      return;
    }
    setItems(res.data.items);
  };

  useEffect(() => {
    void load();
  }, []);

  const open = async (id: string) => {
    const res = await miningAdmin.getPosition(id);
    if (!res.ok) {
      setError(miningFailureMessage(res));
      return;
    }
    setDetail(res.data);
  };

  return (
    <div className="mine-stack" data-testid="position-management">
      {error ? <MineError message={error} /> : null}
      <section className="panel">
        <div className="panelhead"><div><h2>운용 현황</h2><p>사용자·광산·상태로 서버 운용 내역을 조회합니다.</p></div></div>
        <div className="mine-filter-row">
          <input placeholder="사용자 ID" value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })} />
          <input placeholder="광산 ID" value={filters.mineId} onChange={(e) => setFilters({ ...filters, mineId: e.target.value })} />
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">전체 상태</option>
            {Object.entries(POSITION_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className="mine-button" type="button" onClick={() => void load()}>조회</button>
        </div>
        {items == null ? (
          <p className="ops-hint">불러오는 중…</p>
        ) : items.length === 0 ? (
          <MineEmpty title="운용 내역이 없습니다" body="현재 조건에 맞는 실제 운용이 없습니다." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>광산</th><th>사용자</th><th>원금</th><th>상태</th><th>시작</th></tr></thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.positionId} onClick={() => void open(row.positionId)}>
                    <td><b>{row.mineName}</b><small className="mine-cell-note">{row.mineCode}</small></td>
                    <td>{shortId(row.userId)}</td>
                    <td>{formatMoney(row.principalAmount)} USDT</td>
                    <td><MineStatus status={row.status} kind="position" /></td>
                    <td>{formatDate(row.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detail ? (
        <section className="panel">
          <div className="panelhead"><div><h2>운용 상세</h2><p>{detail.mineName} · 사용자 {shortId(detail.userId)}</p></div><MineStatus status={detail.status} kind="position" /></div>
          <div className="mine-kv-grid">
            <MineKv label="현재 원금" value={`${formatMoney(detail.principalAmount)} USDT`} />
            <MineKv label="요청 원금" value={`${formatMoney(detail.requestedPrincipalAmount)} USDT`} />
            <MineKv label="시작" value={formatDate(detail.startedAt)} />
            <MineKv label="종료" value={formatDate(detail.endedAt)} />
          </div>
          <h3 className="mine-subtitle">운용 변경 이력</h3>
          {detail.events.length === 0 ? (
            <MineEmpty title="변경 이력이 없습니다" body="서버에 기록된 운용 이벤트가 없습니다." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>구분</th><th>금액</th><th>변경 전</th><th>변경 후</th><th>시각</th></tr></thead>
                <tbody>
                  {detail.events.map((event) => (
                    <tr key={event.eventId}>
                      <td>{eventLabel(event.eventType)}</td>
                      <td>{formatMoney(event.amount)}</td>
                      <td>{formatMoney(event.principalBeforeAmount)}</td>
                      <td>{formatMoney(event.principalAfterAmount)}</td>
                      <td>{formatDate(event.effectiveAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function SettlementManagement({ notify }: { notify: Notify }) {
  const [items, setItems] = useState<SettlementSummary[] | null>(null);
  const [detail, setDetail] = useState<SettlementDetail | null>(null);
  const [filters, setFilters] = useState({ mineId: "", userId: "", status: "" });
  const [retryReason, setRetryReason] = useState("정산 오류 원인을 확인하고 운영자가 재실행합니다.");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    const res = await miningAdmin.listSettlements(filters);
    if (!res.ok) {
      setItems([]);
      setError(miningFailureMessage(res));
      return;
    }
    setItems(res.data.items);
  };

  useEffect(() => {
    void load();
  }, []);

  const open = async (id: string) => {
    const res = await miningAdmin.getSettlement(id);
    if (!res.ok) {
      setError(miningFailureMessage(res));
      return;
    }
    setDetail(res.data);
  };

  const retry = async () => {
    if (!detail || busy) return;
    setBusy(true);
    setError("");
    const res = await miningAdmin.retrySettlement(detail.settlementId, retryReason);
    setBusy(false);
    if (!res.ok) {
      const message = miningFailureMessage(res);
      setError(message);
      notify(message, false);
      return;
    }
    setDetail(res.data);
    notify("정산 재실행 요청이 서버에서 완료되었습니다.");
    await load();
  };

  return (
    <div className="mine-stack" data-testid="settlement-management">
      {error ? <MineError message={error} /> : null}
      <section className="panel">
        <div className="panelhead"><div><h2>정산 관리</h2><p>실패와 검토필요 정산을 포함해 실제 정산 원장 연결 상태를 확인합니다.</p></div></div>
        <div className="mine-filter-row">
          <input placeholder="사용자 ID" value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })} />
          <input placeholder="광산 ID" value={filters.mineId} onChange={(e) => setFilters({ ...filters, mineId: e.target.value })} />
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">전체 상태</option>
            {Object.entries(SETTLEMENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className="mine-button" type="button" onClick={() => void load()}>조회</button>
        </div>
        {items == null ? (
          <p className="ops-hint">불러오는 중…</p>
        ) : items.length === 0 ? (
          <MineEmpty title="정산 내역이 없습니다" body="현재 조건에 맞는 실제 정산이 없습니다." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>광산</th><th>기간 종료</th><th>계산 수익</th><th>지급 수익</th><th>상태</th><th>시도</th></tr></thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.settlementId} onClick={() => void open(row.settlementId)}>
                    <td><b>{row.mineName}</b><small className="mine-cell-note">{shortId(row.userId)}</small></td>
                    <td>{formatDate(row.periodEndAt)}</td>
                    <td>{formatMoney(row.calculatedProfitAmount)}</td>
                    <td>{formatMoney(row.creditedProfitAmount)}</td>
                    <td><MineStatus status={row.status} kind="settlement" /></td>
                    <td>{row.attemptCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detail ? (
        <section className="panel">
          <div className="panelhead"><div><h2>정산 상세</h2><p>{detail.mineName} · {formatDate(detail.periodStartAt)} ~ {formatDate(detail.periodEndAt)}</p></div><MineStatus status={detail.status} kind="settlement" /></div>
          <div className="mine-kv-grid">
            <MineKv label="계산 수익" value={`${formatMoney(detail.calculatedProfitAmount)} USDT`} />
            <MineKv label="지급 수익" value={`${formatMoney(detail.creditedProfitAmount)} USDT`} />
            <MineKv label="원장 반영" value={detail.ledgerJournalId ? "원장 기록 있음" : "아직 없음"} />
            <MineKv label="오류 기록" value={detail.failureCode ? "확인 필요" : "없음"} />
          </div>
          <h3 className="mine-subtitle">수익 발생 구간</h3>
          {detail.accruals.length === 0 ? (
            <MineEmpty title="연결된 발생 구간이 없습니다" body="서버가 연결한 발생 수익 구간이 없습니다." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>기간</th><th>원금</th><th>일 수익률</th><th>수익</th></tr></thead>
                <tbody>
                  {detail.accruals.map((accrual) => (
                    <tr key={accrual.accrualId}>
                      <td>{formatDate(accrual.periodStartAt)} ~ {formatDate(accrual.periodEndAt)}</td>
                      <td>{formatMoney(accrual.principalAmount)}</td>
                      <td>{formatRate(accrual.dailyRate)}</td>
                      <td>{formatMoney(accrual.profitAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {detail.status === "FAILED" || detail.status === "REVIEW_REQUIRED" ? (
            <div className="mine-retry">
              <MineField label="재실행 사유"><textarea rows={2} value={retryReason} onChange={(e) => setRetryReason(e.target.value)} /></MineField>
              <button className="mine-button mine-button-danger" type="button" disabled={busy || retryReason.trim().length < 8} onClick={() => void retry()}>정산 재실행</button>
              <p className="ops-hint">서버가 성공하기 전에는 완료로 표시하지 않습니다.</p>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function MiningSystemControl({ notify }: { notify: Notify }) {
  const [items, setItems] = useState<MiningSwitch[] | null>(null);
  const [reason, setReason] = useState("광산 운영 안전을 위한 시스템 제어 변경입니다.");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const res = await miningAdmin.listSwitches();
    if (!res.ok) {
      setItems([]);
      setError(miningFailureMessage(res));
      return;
    }
    setItems(
      res.data.items.filter((item) => MINING_SWITCHES.some((locked) => locked.id === item.id)),
    );
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = async (
    id: typeof MINING_SWITCHES[number]["id"],
    engaged: boolean,
  ) => {
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await miningAdmin.setSwitch(id, engaged, reason);
    setBusy(false);
    if (!res.ok) {
      const message = miningFailureMessage(res);
      setError(message);
      notify(message, false);
      return;
    }
    setItems(
      res.data.items.filter((item) => MINING_SWITCHES.some((locked) => locked.id === item.id)),
    );
    notify(engaged ? "안전 제어를 켰습니다." : "안전 제어를 해제했습니다.");
  };

  return (
    <div className="mine-stack" data-testid="mining-system-control">
      {error ? <MineError message={error} /> : null}
      <section className="panel">
        <div className="panelhead">
          <div><h2>시스템 제어</h2><p>광산에 필요한 두 개의 기존 서버 안전 제어만 표시합니다.</p></div>
          <button className="mine-button mine-button-ghost" type="button" onClick={() => void load()} disabled={busy}>새로고침</button>
        </div>
        <MineField label="변경 사유"><textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></MineField>
        <div className="mine-switch-list">
          {MINING_SWITCHES.map((locked) => {
            const current = items?.find((item) => item.id === locked.id);
            return (
              <div className={`mine-switch${current?.engaged ? " is-engaged" : ""}`} key={locked.id}>
                <div>
                  <b>{locked.label}</b>
                  <p>{locked.description}</p>
                  <small>{items == null ? "상태 확인 중" : current?.engaged ? "현재 중지됨" : "현재 정상 운영"}</small>
                </div>
                <button
                  type="button"
                  className={`mine-button${current?.engaged ? "" : " mine-button-danger"}`}
                  disabled={busy || items == null || reason.trim().length < 10}
                  onClick={() => void toggle(locked.id, !current?.engaged)}
                >
                  {current?.engaged ? "해제" : "중지"}
                </button>
              </div>
            );
          })}
        </div>
        <p className="ops-hint">이 제어는 화면 표시가 아니라 Backend에서 직접 강제됩니다.</p>
      </section>
    </div>
  );
}

function MineField({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`mine-field${wide ? " is-wide" : ""}`}><span>{label}</span>{children}</label>;
}

function MineStatus({
  status,
  kind,
}: {
  status: string;
  kind: "mine" | "rate" | "position" | "settlement";
}) {
  const label = kind === "mine"
    ? mineStatusLabel(status)
    : kind === "rate"
      ? rateStatusLabel(status)
      : kind === "position"
        ? positionStatusLabel(status)
        : settlementStatusLabel(status);
  const danger = status === "FAILED" || status === "REVIEW_REQUIRED" || status === "PAUSED" || status === "ENDED";
  const pending = status.includes("PENDING") || status === "READY" || status === "SCHEDULED" || status === "NEW_POSITIONS_PAUSED";
  return <span className={`mine-status${danger ? " is-danger" : pending ? " is-pending" : " is-ok"}`}>{label}</span>;
}

function MineError({ message }: { message: string }) {
  return <div className="mine-error" role="alert"><b>처리하지 않았습니다</b><span>{message}</span></div>;
}

function MineEmpty({ title, body }: { title: string; body: string }) {
  return <div className="empty-box"><b>{title}</b><p>{body}</p></div>;
}

function MineKv({ label, value }: { label: string; value: string }) {
  return <div className="mine-kv"><span>{label}</span><b>{value}</b></div>;
}

function shortId(value: string): string {
  if (!value) return "—";
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("ko-KR") : "—";
}

function formatMoney(value: string | null | undefined): string {
  if (value == null || value === "") return "0";
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 8 }).format(number);
}

function formatRate(value: string): string {
  const number = Number(value);
  return Number.isFinite(number)
    ? `${(number * 100).toLocaleString("ko-KR", { maximumFractionDigits: 8 })}%`
    : "확인 필요";
}

function eventLabel(value: string): string {
  const map: Record<string, string> = {
    START: "운용 시작",
    INCREASE: "증액",
    DECREASE: "감액",
    END: "운용 종료",
  };
  return map[value] ?? "운용 변경";
}
