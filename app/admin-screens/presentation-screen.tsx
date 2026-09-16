"use client";

import { useEffect, useState } from "react";
import { COPY } from "../../lib/admin/copy";
import {
  JOURNEY_V19_DEFAULT_AT_SEC,
  JOURNEY_V19_DEFAULT_TOTAL_SEC,
  JOURNEY_V19_LABEL_KO,
  JOURNEY_V19_STEPS,
  type JourneyV19Step,
} from "../../lib/admin/contract";
import type { AdminResult } from "../../lib/admin/errors";
import { compiledV19Profile, previewPresentation, type PresentationListing } from "../../lib/admin/presentation";
import type { AdminOpsPort, ConfirmDraft } from "../../lib/admin/types";
import { ConfirmDialog, Field, ResultBanner, Stat } from "./shared";

export function PresentationScreen({
  adapter,
  notify,
}: {
  adapter: AdminOpsPort;
  notify: (message: string, ok?: boolean) => void;
}) {
  const [listed, setListed] = useState<PresentationListing | null>(null);
  const [error, setError] = useState<AdminResult<unknown> | null>(null);
  const [total, setTotal] = useState(String(JOURNEY_V19_DEFAULT_TOTAL_SEC));
  const [atSec, setAtSec] = useState<Record<JourneyV19Step, string>>(
    Object.fromEntries(JOURNEY_V19_STEPS.map((id) => [id, String(JOURNEY_V19_DEFAULT_AT_SEC[id])])) as Record<
      JourneyV19Step,
      string
    >,
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<ConfirmDraft | null>(null);
  const [previewText, setPreviewText] = useState("");

  const applyListing = (row: PresentationListing) => {
    setListed(row);
    setTotal(String(row.totalDurationSec));
    setAtSec(Object.fromEntries(row.phases.map((p) => [p.id, String(p.atSec)])) as Record<JourneyV19Step, string>);
  };

  const reload = async () => {
    const res = await adapter.listPresentation();
    if (!res.ok) {
      setError(res);
      setListed(null);
      return;
    }
    setError(null);
    applyListing(res.data);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await adapter.listPresentation();
      if (cancelled) return;
      if (!res.ok) {
        setError(res);
        setListed(null);
        return;
      }
      setError(null);
      applyListing(res.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [adapter]);

  const draftProfile = () => ({
    ...compiledV19Profile(),
    totalDurationSec: Number(total),
    phases: JOURNEY_V19_STEPS.map((id) => ({ id, atSec: Number(atSec[id]) })),
    phaseAtSec: Object.fromEntries(JOURNEY_V19_STEPS.map((id) => [id, Number(atSec[id])])) as Record<JourneyV19Step, number>,
  });

  const runPreview = () => {
    const res = previewPresentation(draftProfile());
    if (!res.ok) {
      setPreviewText(res.message);
      notify(res.message, false);
      return;
    }
    setPreviewText(
      res.data.phases.map((p) => `${JOURNEY_V19_LABEL_KO[p.id]} ${p.atSec}초`).join(" → ") +
        ` / 전체 ${res.data.totalDurationSec}초. 참여·정산은 만들지 않아요.`,
    );
  };

  const restore = () => {
    const def = compiledV19Profile();
    setTotal(String(def.totalDurationSec));
    setAtSec(Object.fromEntries(def.phases.map((p) => [p.id, String(p.atSec)])) as Record<JourneyV19Step, string>);
    setPreviewText("기본 70초를 편집창에만 되돌렸어요. 아직 저장하지 않았어요.");
  };

  const save = async () => {
    if (!listed || busy) return;
    const checked = previewPresentation(draftProfile());
    if (!checked.ok) {
      setError(checked);
      notify(checked.message, false);
      return;
    }
    setBusy(true);
    const res = await adapter.putPresentation({
      profile: checked.data,
      reason,
      expectedRevision: listed.revision,
    });
    setBusy(false);
    setDraft(null);
    if (!res.ok) {
      setError(res);
      notify(res.message, false);
      await reload();
      return;
    }
    if (!res.data.applied || res.data.storeStatus === "unready") {
      notify(COPY.storeUnready, false);
      applyListing(res.data);
      return;
    }
    notify("화면 진행 시간을 서버에서 다시 확인했어요.", true);
    applyListing(res.data);
  };

  return (
    <>
      <ResultBanner result={error} />
      <div className="stats">
        <Stat label="저장 번호" value={listed ? String(listed.revision) : "확인 중"} detail="다른 직원이 먼저 바꾸면 다시 불러 주세요" />
        <Stat
          label="저장 상태"
          value={listed?.storeStatus ?? "확인 중"}
          detail={listed?.operatorTimeSettingsComplete ? "운영자 초가 적용됨" : "기본값 또는 준비 중"}
        />
        <Stat label="전체 시간" value={listed ? `${listed.totalDurationSec}초` : "확인 중"} detail="70초는 기본값이며 유일한 값은 아니에요." />
        <Stat label="참여 발생" value="없음" detail={COPY.previewOnly} />
      </div>
      <section className="panel">
        <div className="panelhead">
          <div>
            <h2>화면 진행 시간</h2>
            <p>{COPY.displayHelp}</p>
          </div>
        </div>
        <p className="ops-hint">{COPY.displayInFlight}</p>
        <div className="ops-form">
          {JOURNEY_V19_STEPS.map((id) => (
            <Field key={id} label={`${JOURNEY_V19_LABEL_KO[id]} 시작(초)`} hint={id === "product" ? "첫 단계는 0초" : "이전보다 크고 전체 시간보다 작아야 해요."}>
              <input
                value={atSec[id]}
                onChange={(e) => setAtSec((prev) => ({ ...prev, [id]: e.target.value }))}
                inputMode="numeric"
              />
            </Field>
          ))}
          <Field label="전체 시간(초)" hint="1~600. 70만 되는 것은 아니에요.">
            <input value={total} onChange={(e) => setTotal(e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="사유">
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="ops-actions">
            <button type="button" onClick={runPreview} disabled={busy}>
              미리보기
            </button>
            <button type="button" onClick={restore} disabled={busy}>
              기본 70초 편집창에 넣기
            </button>
            <button
              type="button"
              className="primary"
              disabled={busy || !listed}
              onClick={() =>
                setDraft({
                  title: "화면 진행 시간을 저장할까요?",
                  targetLabel: "전체 회원 화면 안내",
                  currentLabel: listed
                    ? listed.phases.map((p) => `${JOURNEY_V19_LABEL_KO[p.id]} ${p.atSec}초`).join(", ")
                    : "확인 중",
                  nextLabel: JOURNEY_V19_STEPS.map((id) => `${JOURNEY_V19_LABEL_KO[id]} ${atSec[id]}초`).join(", "),
                  impact: "돈·횟수·등급은 바뀌지 않아요. 이미 시작된 안내는 시작 당시 값을 유지해요.",
                  reason,
                })
              }
            >
              저장 요청
            </button>
          </div>
          {previewText ? <p className="ops-hint">{previewText}</p> : null}
        </div>
      </section>
      {draft ? (
        <ConfirmDialog draft={draft} busy={busy} close={() => (busy ? null : setDraft(null))} confirm={() => void save()} />
      ) : null}
    </>
  );
}
