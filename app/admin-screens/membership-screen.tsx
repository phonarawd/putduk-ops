"use client";

import { useEffect, useRef, useState } from "react";
import { COPY } from "../../lib/admin/copy";
import { MEMBERSHIP_IDS, MEMBERSHIP_LABEL_KO, isUuid, sameUserId, type MembershipId } from "../../lib/admin/contract";
import { grantStatusLabelKo, quotaSourceLabelKo, storeStatusLabelKo } from "../../lib/admin/labels";
import { QA_USERS } from "../../lib/admin/qa/isolated-store";
import { navHref } from "../../lib/admin-routes";
import { resolveOrigin } from "../../lib/admin/origin";
import type { AdminResult } from "../../lib/admin/errors";
import type { AdminOpsPort, BonusList, ConfirmDraft, MembershipSnapshot } from "../../lib/admin/types";
import {
  Badge,
  ConfirmDialog,
  Field,
  ResultBanner,
  Stat,
  UnknownStat,
  WaitBanner,
  formatCount,
  newIdempotencyKey,
} from "./shared";

export function UsersSearch({
  lastId,
  adapter,
}: {
  lastId?: string;
  adapter: AdminOpsPort;
}) {
  const [value, setValue] = useState(lastId ?? "");
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState<AdminResult<unknown> | null>(null);
  const origin = resolveOrigin();
  const go = async () => {
    const id = value.trim();
    if (!isUuid(id) || busy) return;
    setBusy(true);
    setLookup(null);
    const found = await adapter.lookupUser(id);
    setBusy(false);
    if (!found.ok) {
      setLookup(found);
      return;
    }
    if (!sameUserId(found.data.userId, id) || found.data.substituted) {
      setLookup({
        ok: false,
        status: 409,
        code: "USER_MISMATCH",
        message: COPY.userMismatch,
        applied: false,
      });
      return;
    }
    window.location.assign(navHref(`/users/${found.data.userId}`));
  };
  return (
    <section className="panel">
      <div className="panelhead">
        <div>
          <h2>정확한 회원 찾기</h2>
          <p>{COPY.usersSearchHelp}</p>
        </div>
      </div>
      <ResultBanner result={lookup && !lookup.ok ? lookup : null} />
      <div className="ops-form">
        <Field label="회원 번호" hint="한 명만 찾습니다. 없는 번호는 다른 회원으로 바꾸지 않아요.">
          <input
            data-testid="users-q"
            value={value}
            onChange={(e) => setValue(e.target.value.trim())}
            placeholder="예: 11111111-1111-4111-8111-111111111111"
            onKeyDown={(e) => {
              if (e.key === "Enter") void go();
            }}
          />
        </Field>
        <button
          className="primary"
          type="button"
          data-testid="users-lookup"
          onClick={() => void go()}
          disabled={!isUuid(value.trim()) || busy}
        >
          {busy ? "찾는 중…" : "이 회원 보기"}
        </button>
        {!value.trim() ? (
          <p className="ops-hint">빈칸으로는 회원 목록을 만들지 않아요. 아직 찾지 않았습니다.</p>
        ) : isUuid(value.trim()) ? null : (
          <p className="ops-hint">형식이 맞지 않아요. 첫 번째 회원으로 바꾸지 않았어요.</p>
        )}
      </div>
      {origin.mode === "isolated-qa" ? (
        <div className="ops-form">
          <p className="ops-hint">연습 화면용 회원만 아래에 있어요. 실제 회원 목록이 아닙니다.</p>
          <div className="ops-chip-row">
            <button type="button" data-testid="chip-explicit8" onClick={() => window.location.assign(navHref(`/users/${QA_USERS.explicit8}`))}>
              기존 명시 8회
            </button>
            <button type="button" data-testid="chip-cap0" onClick={() => window.location.assign(navHref(`/users/${QA_USERS.cap0}`))}>
              0회 차단
            </button>
            <button type="button" data-testid="chip-signup5" onClick={() => window.location.assign(navHref(`/users/${QA_USERS.signup5}`))}>
              신규 기본 5회
            </button>
            <button type="button" data-testid="chip-missing" onClick={() => window.location.assign(navHref(`/users/${QA_USERS.missing}`))}>
              없는 회원
            </button>
            <button
              type="button"
              data-testid="chip-client-explicit8"
              onClick={() => {
                const href = `/users/${QA_USERS.explicit8}`;
                window.history.pushState({}, "", href);
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
            >
              바로 열기(명시 8회)
            </button>
            <button
              type="button"
              data-testid="chip-client-cap0"
              onClick={() => {
                const href = `/users/${QA_USERS.cap0}`;
                window.history.pushState({}, "", href);
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
            >
              바로 열기(0회)
            </button>
          </div>
        </div>
      ) : (
        <WaitBanner>{COPY.usersSearchHelp} 전체 회원 목록은 아직 없습니다.</WaitBanner>
      )}
    </section>
  );
}

export function MembershipWorkspace({
  userId,
  adapter,
  notify,
}: {
  userId: string;
  adapter: AdminOpsPort;
  notify: (message: string, ok?: boolean) => void;
}) {
  const [snap, setSnap] = useState<MembershipSnapshot | null>(null);
  const [bonus, setBonus] = useState<BonusList | null>(null);
  const [load, setLoad] = useState<AdminResult<unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [nextCap, setNextCap] = useState("");
  const [bonusAmount, setBonusAmount] = useState("1");
  const [reclaimAmount, setReclaimAmount] = useState("");
  const [nextGrade, setNextGrade] = useState<MembershipId>("sprout");
  const [idem, setIdem] = useState(newIdempotencyKey());
  const [draft, setDraft] = useState<null | { kind: string; confirm: ConfirmDraft; run: () => Promise<AdminResult<unknown>> }>(null);
  const genRef = useRef(0);
  const busyRef = useRef(false);

  const invalidId: AdminResult<unknown> | null = isUuid(userId)
    ? null
    : {
        ok: false,
        status: 400,
        code: "INVALID_INPUT",
        message: "이 주소는 실제 회원 번호가 아니에요. 다른 회원으로 바꾸지 않았어요.",
        applied: false,
      };

  const reload = async (gen: number) => {
    if (!isUuid(userId) || gen !== genRef.current) return;
    const got = await adapter.getMembership(userId);
    if (gen !== genRef.current) return;
    setLoad(got);
    if (!got.ok) {
      setSnap(null);
      setBonus(null);
      return;
    }
    if (!sameUserId(got.data.membership.userId, userId) || !sameUserId(got.data.quota.userId, userId)) {
      setSnap(null);
      setBonus(null);
      setLoad({
        ok: false,
        status: 409,
        code: "USER_MISMATCH",
        message: COPY.userMismatch,
        applied: false,
      });
      return;
    }
    setSnap(got.data);
    setNextCap(String(got.data.quota.cap));
    setNextGrade(got.data.membership.membership);
    const listed = await adapter.listBonus(userId);
    if (gen !== genRef.current) return;
    if (listed.ok && listed.data.userId && !sameUserId(listed.data.userId, userId)) {
      setBonus(null);
      return;
    }
    setBonus(listed.ok ? listed.data : null);
  };

  useEffect(() => {
    const gen = ++genRef.current;
    void reload(gen);
    return () => {
      genRef.current += 1;
    };
    // reload는 현재 userId 클로저를 쓰며, 회원 전환은 key로 인스턴스를 갈아끼운다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, userId]);

  const runWrite = async (job: () => Promise<AdminResult<unknown>>) => {
    if (busyRef.current || busy) return;
    const gen = genRef.current;
    const expectedUser = userId;
    busyRef.current = true;
    setBusy(true);
    const result = await job();
    if (gen !== genRef.current || !sameUserId(expectedUser, userId)) {
      busyRef.current = false;
      setBusy(false);
      setDraft(null);
      return;
    }
    busyRef.current = false;
    setBusy(false);
    setDraft(null);
    if (!result.ok) {
      setLoad(result);
      notify(result.message, false);
      return;
    }
    const applied =
      result.data && typeof result.data === "object" && "applied" in result.data
        ? (result.data as { applied?: unknown }).applied === true
        : false;
    if (!applied) {
      notify(COPY.noFakeComplete, false);
      await reload(gen);
      return;
    }
    notify("서버가 확인한 결과를 다시 불러왔어요.", true);
    await reload(gen);
  };

  if (invalidId) {
    return (
      <section className="panel">
        <ResultBanner result={invalidId} />
      </section>
    );
  }

  return (
    <>
      <ResultBanner result={load && !load.ok ? load : null} />
      {!snap && load?.ok !== false ? <p className="ops-hint">회원 상태를 불러오는 중…</p> : null}
      {snap ? (
        <>
          <section className="profile">
            <span className="bigavatar">회</span>
            <div>
              <span className="inline">
                <h2>선택한 회원</h2>
                <Badge tone={snap.gradeControl === "MANUAL_PIN" ? "amber" : "green"}>
                  {snap.gradeControl === "MANUAL_PIN" ? "수동 등급 유지" : "자동 등급"}
                </Badge>
                <Badge tone="blue">{snap.labelKo}</Badge>
                {snap.quota.explicitParticipateBlock ? <Badge tone="red">0회 차단</Badge> : null}
              </span>
              <p data-testid="member-user-id">회원 번호 {userId}</p>
              <p
                data-testid="member-reseller-id"
                data-issued={snap.resellerId ? "true" : "false"}
                className={snap.resellerId ? undefined : "ops-hint"}
              >
                {snap.resellerId ? `추천인 번호 ${snap.resellerId}` : COPY.resellerUnissued}
              </p>
            </div>
          </section>
          <div className="stats">
            <Stat label="오늘 사용" value={formatCount(snap.quota.used)} detail="서버가 센 오늘 참여" />
            <Stat label="하루 기본 한도" value={formatCount(snap.quota.cap)} detail={quotaSourceLabelKo(snap.quota.source)} />
            <Stat
              label="기본 잔여"
              value={formatCount(snap.quota.baseRemaining)}
              detail={snap.quota.explicitParticipateBlock ? "명시 0회 차단" : "한도 − 사용"}
            />
            {snap.quota.bonusRemaining == null ? (
              <UnknownStat label="추가 잔여" />
            ) : (
              <Stat label="추가 잔여" value={formatCount(snap.quota.bonusRemaining)} detail="미사용 추가 기회" />
            )}
          </div>
          <div className="stats">
            {snap.quota.participateRemaining == null ? (
              <UnknownStat label="최종 참여 가능량" />
            ) : (
              <Stat
                label="최종 참여 가능량"
                value={formatCount(snap.quota.participateRemaining)}
                detail={snap.quota.blocked ? "지금은 참여할 수 없음" : "서버 판정"}
                tone={snap.quota.blocked ? "red" : "green"}
              />
            )}
            <Stat
              label="적용 기준"
              value={quotaSourceLabelKo(snap.quota.source)}
              detail={snap.quota.storeStatus === "unready" ? "저장소 준비 중" : "서버 응답"}
            />
            <Stat
              label="차단 이유"
              value={
                snap.quota.explicitParticipateBlock
                  ? "명시 0회"
                  : snap.quota.blocked
                    ? "잔여 없음"
                    : "없음"
              }
              detail="추가 지급으로 0회 차단을 풀지 않아요."
            />
            <Stat label="저장 상태" value={storeStatusLabelKo(snap.quota.storeStatus)} detail={COPY.storeUnready} />
          </div>

          <section className="panel">
            <div className="panelhead">
              <div>
                <h2>하루 기본 기회</h2>
                <p>{COPY.capHelp}</p>
              </div>
            </div>
            <div className="ops-form">
              <Field label="바꿀 하루 기본 기회" hint="0이면 신규 참여를 막습니다. 전원 5회로 덮지 않아요.">
                <input value={nextCap} onChange={(e) => setNextCap(e.target.value)} inputMode="numeric" />
              </Field>
              <Field label="사유" hint="10자 이상. 누구에게 왜 바꾸는지 적어 주세요.">
                <textarea data-testid="ops-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
              <div className="ops-actions">
                <button
                  type="button"
                  className="primary"
                  data-testid="cap-save"
                  disabled={busy}
                  onClick={() =>
                    setDraft({
                      kind: "cap",
                      confirm: {
                        title: "하루 기본 기회를 바꿀까요?",
                        targetLabel: userId,
                        currentLabel: formatCount(snap.quota.cap),
                        nextLabel: `${nextCap}회`,
                        impact: "최소 이익·엄격함·자본·돈은 그대로입니다.",
                        reason,
                      },
                      run: () =>
                        adapter.putDailyMatchCap(userId, {
                          dailyUserMatchCap: Number(nextCap),
                          reason,
                        }),
                    })
                  }
                >
                  한도 변경 요청
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setDraft({
                      kind: "cap0",
                      confirm: {
                        title: "오늘부터 0회로 막을까요?",
                        targetLabel: userId,
                        currentLabel: formatCount(snap.quota.cap),
                        nextLabel: "0회 차단",
                        impact: "추가 기회를 줘도 이 차단은 풀리지 않아요.",
                        reason,
                      },
                      run: () => adapter.putDailyMatchCap(userId, { dailyUserMatchCap: 0, reason }),
                    })
                  }
                >
                  0회 차단
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setDraft({
                      kind: "clear",
                      confirm: {
                        title: "개인 지정을 해제할까요?",
                        targetLabel: userId,
                        currentLabel: formatCount(snap.quota.cap),
                        nextLabel: "개인 지정 없음",
                        impact: "등급 기본 기회가 다시 적용될 수 있어요. 사용 이력은 지우지 않아요.",
                        reason,
                      },
                      run: () => adapter.putDailyMatchCap(userId, { clear: true, reason }),
                    })
                  }
                >
                  개인 지정 해제
                </button>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panelhead">
              <div>
                <h2>추가 기회 지급·회수</h2>
                <p>{COPY.bonusHelp}</p>
              </div>
            </div>
            <div className="ops-form">
              <Field label="지급 수량">
                <input value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)} inputMode="numeric" />
              </Field>
              <Field label="같은 요청으로 다시 보내기" hint="결과가 불명확하면 이 값으로 다시 확인하고, 새 요청을 만들지 마세요.">
                <input value={idem} onChange={(e) => setIdem(e.target.value)} />
              </Field>
              <div className="ops-actions">
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    setDraft({
                      kind: "grant",
                      confirm: {
                        title: "추가 기회를 지급할까요?",
                        targetLabel: userId,
                        currentLabel: formatCount(snap.quota.bonusRemaining),
                        nextLabel: `${bonusAmount}회 추가`,
                        impact: "계정 정지나 0회 차단은 풀리지 않아요. 만료·이월은 켜져 있지 않아요.",
                        reason,
                      },
                      run: () =>
                        adapter.grantBonus(userId, {
                          amount: Number(bonusAmount),
                          reason,
                          idempotencyKey: idem,
                        }),
                    })
                  }
                >
                  추가 기회 지급
                </button>
                <button type="button" disabled={busy} onClick={() => setIdem(newIdempotencyKey())}>
                  새 요청 키
                </button>
              </div>
              <Field label="회수 수량" hint="비우면 미사용분 전부">
                <input value={reclaimAmount} onChange={(e) => setReclaimAmount(e.target.value)} inputMode="numeric" />
              </Field>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  setDraft({
                    kind: "reclaim",
                    confirm: {
                      title: "미사용 기회를 회수할까요?",
                      targetLabel: userId,
                      currentLabel: formatCount(snap.quota.bonusRemaining),
                      nextLabel: reclaimAmount ? `${reclaimAmount}회 회수` : "미사용 전부 회수",
                      impact: "이미 쓴 횟수는 되돌리지 않아요.",
                      reason,
                    },
                    run: () =>
                      adapter.reclaimBonus(userId, {
                        amount: reclaimAmount ? Number(reclaimAmount) : undefined,
                        reason,
                      }),
                  })
                }
              >
                미사용 기회 회수
              </button>
              <div className="ops-history">
                <b>추가 기회 이력</b>
                {!bonus ? <p>이력을 확인할 수 없어요.</p> : null}
                {bonus && bonus.storeStatus === "unready" ? <p>저장소 준비 전이라 지급 이력이 비어 있어요.</p> : null}
                {bonus?.grants.map((g) => (
                  <p key={g.grantId}>
                    +{g.amount}회 · 사용 {g.used} · 회수 {g.reclaimed} · {grantStatusLabelKo(g.status)}
                  </p>
                ))}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panelhead">
              <div>
                <h2>수동 등급 유지</h2>
                <p>{COPY.pinHelp}</p>
              </div>
            </div>
            <div className="ops-form">
              <Field label="바꿀 등급">
                <select value={nextGrade} onChange={(e) => setNextGrade(e.target.value as MembershipId)}>
                  {MEMBERSHIP_IDS.map((id) => (
                    <option key={id} value={id}>
                      {MEMBERSHIP_LABEL_KO[id]}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="ops-actions">
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    setDraft({
                      kind: "pin",
                      confirm: {
                        title: "등급을 수동으로 유지할까요?",
                        targetLabel: userId,
                        currentLabel: `${snap.labelKo} · ${snap.gradeControl}`,
                        nextLabel: `${MEMBERSHIP_LABEL_KO[nextGrade]} · 수동 유지`,
                        impact: "개인 한도 0과 사용 이력은 보존합니다. 자동 하향은 켜지지 않아요.",
                        reason,
                      },
                      run: () => adapter.forceMembership(userId, { membership: nextGrade, reason }),
                    })
                  }
                >
                  수동 등급 유지
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setDraft({
                      kind: "auto",
                      confirm: {
                        title: "자동 등급으로 되돌릴까요?",
                        targetLabel: userId,
                        currentLabel: `${snap.labelKo} · ${snap.gradeControl}`,
                        nextLabel: "자동 등급",
                        impact: "서버가 다시 계산한 등급을 따릅니다. 사용량은 초기화하지 않아요.",
                        reason,
                      },
                      run: () => adapter.forceMembership(userId, { clearForce: true, reason }),
                    })
                  }
                >
                  자동 등급으로 되돌리기
                </button>
              </div>
            </div>
          </section>
        </>
      ) : null}
      {draft ? (
        <ConfirmDialog
          draft={draft.confirm}
          busy={busy}
          close={() => (busy ? null : setDraft(null))}
          confirm={() => void runWrite(draft.run)}
        />
      ) : null}
    </>
  );
}
