"use client";

import { useEffect, useState } from "react";
import { COPY } from "../../lib/admin/copy";
import { GRADE_DAILY_MATCH_DEFAULTS, MEMBERSHIP_IDS, MEMBERSHIP_LABEL_KO, OBSERVED_LADDER_CAPS, type MembershipId } from "../../lib/admin/contract";
import type { AdminResult } from "../../lib/admin/errors";
import type { AdminOpsPort, ConfirmDraft, GradeDailyCaps } from "../../lib/admin/types";
import { ConfirmDialog, Field, ResultBanner, formatCount } from "./shared";

export function GradesScreen({
  adapter,
  notify,
}: {
  adapter: AdminOpsPort;
  notify: (message: string, ok?: boolean) => void;
}) {
  const [listed, setListed] = useState<GradeDailyCaps | null>(null);
  const [error, setError] = useState<AdminResult<unknown> | null>(null);
  const [grade, setGrade] = useState<MembershipId>("sprout");
  const [cap, setCap] = useState(String(GRADE_DAILY_MATCH_DEFAULTS.sprout));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<ConfirmDraft | null>(null);

  const reload = async () => {
    const res = await adapter.listGradeDailyCaps();
    if (!res.ok) {
      setError(res);
      setListed(null);
      return;
    }
    setError(null);
    setListed(res.data);
    setCap(String(res.data.caps[grade] ?? GRADE_DAILY_MATCH_DEFAULTS[grade]));
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await adapter.listGradeDailyCaps();
      if (cancelled) return;
      if (!res.ok) {
        setError(res);
        setListed(null);
        return;
      }
      setError(null);
      setListed(res.data);
      setCap(String(res.data.caps.sprout ?? GRADE_DAILY_MATCH_DEFAULTS.sprout));
    })();
    return () => {
      cancelled = true;
    };
  }, [adapter]);

  const save = async () => {
    if (!listed || busy) return;
    setBusy(true);
    const res = await adapter.putGradeDailyCap({
      grade,
      dailyUserMatchCap: Number(cap),
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
    if (!res.data.applied) {
      notify(COPY.noFakeComplete, false);
      await reload();
      return;
    }
    notify("등급별 하루 기본 기회를 서버에서 다시 확인했어요.", true);
    await reload();
  };

  return (
    <>
      <ResultBanner result={error} />
      <section className="panel">
        <div className="panelhead">
          <div>
            <h2>등급별 하루 기본 기회</h2>
            <p>{COPY.gradeHelp}</p>
          </div>
        </div>
        {!listed ? <p className="ops-hint">등급 설정을 불러오는 중…</p> : null}
        {listed ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>등급</th>
                  <th>지금 기본</th>
                  <th>새로 가입하면</th>
                  <th>예전 기준(참고)</th>
                </tr>
              </thead>
              <tbody>
                {MEMBERSHIP_IDS.map((id) => (
                  <tr key={id}>
                    <td>{MEMBERSHIP_LABEL_KO[id]}</td>
                    <td>{formatCount(listed.caps[id])}</td>
                    <td>{formatCount(listed.compiledDefaults[id] ?? GRADE_DAILY_MATCH_DEFAULTS[id])}</td>
                    <td>{formatCount(OBSERVED_LADDER_CAPS[id])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="ops-form">
          <p className="ops-hint">
            저장 번호 {listed?.revision ?? "확인 중"} · 기존 회원 일괄 변경 {listed?.existingMemberBackfill === false ? "없음" : "확인 불가"} · {listed?.storeStatus === "unready" ? "저장 아직 준비 중" : listed?.storeStatus === "ready" ? "저장 가능" : "저장 상태 확인 중"}
          </p>
          <Field label="바꿀 등급">
            <select
              value={grade}
              onChange={(e) => {
                const next = e.target.value as MembershipId;
                setGrade(next);
                setCap(String(listed?.caps[next] ?? GRADE_DAILY_MATCH_DEFAULTS[next]));
              }}
            >
              {MEMBERSHIP_IDS.map((id) => (
                <option key={id} value={id}>
                  {MEMBERSHIP_LABEL_KO[id]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="하루 기본 기회">
            <input value={cap} onChange={(e) => setCap(e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="사유">
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <button
            type="button"
            className="primary"
            disabled={busy || !listed}
            onClick={() =>
              setDraft({
                title: "이 등급의 하루 기본 기회를 바꿀까요?",
                targetLabel: MEMBERSHIP_LABEL_KO[grade],
                currentLabel: formatCount(listed?.caps[grade]),
                nextLabel: `${cap}회`,
                impact: "이미 개인 한도가 있는 회원은 그대로 둡니다. 사용 이력을 초기화하지 않아요.",
                reason,
              })
            }
          >
            등급 기본 기회 저장
          </button>
        </div>
      </section>
      {draft ? (
        <ConfirmDialog draft={draft} busy={busy} close={() => (busy ? null : setDraft(null))} confirm={() => void save()} />
      ) : null}
    </>
  );
}
