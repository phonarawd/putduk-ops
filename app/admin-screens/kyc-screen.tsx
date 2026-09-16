"use client";

import { useEffect, useState } from "react";
import { navHref } from "../../lib/admin-routes";
import type { AdminOpsPort, KycQueueItem } from "../../lib/admin/types";
import { newIdempotencyKey } from "./shared";

export function KycQueue({
  adapter,
  notify,
}: {
  adapter: AdminOpsPort;
  notify: (s: string, ok?: boolean) => void;
}) {
  const [items, setItems] = useState<KycQueueItem[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await adapter.listKyc("pending");
    setItems(res.ok ? res.data.items : []);
  };

  useEffect(() => {
    void load();
  }, [adapter]);

  const decide = async (userId: string, decision: "approve" | "reject") => {
    if (busy) return;
    setBusy(true);
    const res = await adapter.decideKyc(userId, decision, {
      idempotencyKey: newIdempotencyKey(),
      reason: decision === "reject" ? "운영자가 본인 확인을 거절했습니다." : undefined,
    });
    setBusy(false);
    notify(res.ok ? (decision === "approve" ? "본인 확인을 통과했어요." : "본인 확인을 거절했어요.") : "처리하지 않았어요.", res.ok);
    await load();
  };

  return (
    <section className="panel" data-testid="kyc-queue">
      <div className="panelhead">
        <div>
          <h2>본인 확인</h2>
          <p>대기 중인 제출만 보여 줍니다. 가짜 대기열을 만들지 않았어요.</p>
        </div>
      </div>
      {items == null ? (
        <p className="ops-hint">불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="empty-box">
          <b>확인할 제출이 없어요</b>
          <p>연결은 되어 있고, 지금은 대기 건이 없습니다.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>회원</th>
                <th>이름</th>
                <th>시각</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.submissionId}>
                  <td>
                    <a href={navHref(`/users/${row.userId}`)}>{row.userId.slice(0, 8)}…</a>
                  </td>
                  <td>{row.legalName || "—"}</td>
                  <td>{row.createdAt ? new Date(row.createdAt).toLocaleString("ko-KR") : "—"}</td>
                  <td className="ops-actions">
                    <button type="button" disabled={busy} onClick={() => void decide(row.userId, "approve")}>
                      통과
                    </button>
                    <button type="button" disabled={busy} onClick={() => void decide(row.userId, "reject")}>
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
