"use client";

import { useEffect, useState } from "react";
import { CMS_KIND_LABEL_KO, type CmsKind } from "../../lib/admin/contract";
import { COPY } from "../../lib/admin/copy";
import type { AdminOpsPort, CmsPost } from "../../lib/admin/types";
import { Field, ResultBanner } from "./shared";

const STATUS_KO: Record<CmsPost["status"], string> = {
  draft: "초안",
  published: "게시 중",
  ended: "게시 종료",
};

export function CmsScreen({
  kind,
  adapter,
  notify,
}: {
  kind: CmsKind;
  adapter: AdminOpsPort;
  notify: (s: string, ok?: boolean) => void;
}) {
  const [items, setItems] = useState<CmsPost[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Awaited<ReturnType<AdminOpsPort["listCms"]>> | null>(null);

  const load = async () => {
    const res = await adapter.listCms(kind);
    if (!res.ok) {
      setError(res);
      setItems([]);
      return;
    }
    setError(null);
    setItems(res.data.items);
  };

  useEffect(() => {
    setItems(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const run = async (work: () => Promise<{ ok: boolean; message?: string }>, okMsg: string) => {
    if (busy) return;
    setBusy(true);
    const res = await work();
    setBusy(false);
    if (!res.ok) {
      notify("message" in res && res.message ? res.message : "저장하지 않았어요.", false);
      return;
    }
    notify(okMsg, true);
    await load();
  };

  return (
    <section className="panel" data-testid="cms-screen">
      <div className="panelhead">
        <div>
          <h2>{CMS_KIND_LABEL_KO[kind]}</h2>
          <p>{COPY.cmsHelp}</p>
        </div>
      </div>
      <ResultBanner result={error && !error.ok ? error : null} />
      <div className="ops-form">
        <Field label="제목" hint="손님에게 그대로 보입니다. 토토·베팅 문구는 거절됩니다.">
          <input data-testid="cms-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        </Field>
        <Field label="본문">
          <textarea data-testid="cms-body" value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <button
          className="primary"
          type="button"
          data-testid="cms-create"
          disabled={busy || !title.trim()}
          onClick={() =>
            void run(async () => {
              const res = await adapter.createCms(kind, { title, body });
              if (res.ok) {
                setTitle("");
                setBody("");
              }
              return res;
            }, "초안으로 저장했어요.")
          }
        >
          {busy ? "저장 중…" : "초안 저장"}
        </button>
      </div>
      {items == null ? (
        <p className="ops-hint">목록을 불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="empty-box">
          <b>아직 글이 없어요</b>
          <p>위에서 초안을 저장한 뒤 게시하면 손님 화면에 보입니다.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table data-testid="cms-table">
            <thead>
              <tr>
                <th>상태</th>
                <th>제목</th>
                <th>게시</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>{STATUS_KO[row.status]}</td>
                  <td>{row.title}</td>
                  <td>{row.publishedAt ? new Date(row.publishedAt).toLocaleString("ko-KR") : "—"}</td>
                  <td className="ops-actions">
                    {row.status === "draft" ? (
                      <button
                        type="button"
                        data-testid={`cms-publish-${row.id}`}
                        disabled={busy}
                        onClick={() => void run(() => adapter.publishCms(kind, row.id), "게시했어요.")}
                      >
                        게시
                      </button>
                    ) : null}
                    {row.status === "published" ? (
                      <button
                        type="button"
                        data-testid={`cms-end-${row.id}`}
                        disabled={busy}
                        onClick={() => void run(() => adapter.endCms(kind, row.id), "게시를 끝냈어요.")}
                      >
                        게시종료
                      </button>
                    ) : null}
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
