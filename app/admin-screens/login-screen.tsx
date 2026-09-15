"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Eye, EyeOff } from "lucide-react";
import { COPY } from "../../lib/admin/copy";
import { CURRENT_CONTRACT_PATHS, CONTRACT_ACTIVATION, LEGACY_DOCUMENTED_PATHS } from "../../lib/admin/contract";
import { navHref } from "../../lib/admin-routes";
import { resolveOrigin, rememberIsolatedQa, isLoopbackHost } from "../../lib/admin/origin";
import type { AdminOpsPort } from "../../lib/admin/types";

export function LoginScreen({
  adapter,
  returnTo,
  onAuthed,
}: {
  adapter: AdminOpsPort;
  returnTo: string;
  onAuthed: () => void;
}) {
  const origin = resolveOrigin();
  const [id, setId] = useState(origin.mode === "isolated-qa" ? "qa-super" : "");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const loopback = typeof window !== "undefined" && isLoopbackHost(window.location.hostname);

  useEffect(() => {
    if (origin.mode !== "live") return;
    let alive = true;
    void adapter.session().then((res) => {
      if (!alive || !res.ok || !res.data.connected) return;
      const next = returnTo.startsWith("/") ? returnTo : "/";
      window.location.assign(next);
      onAuthed();
    });
    return () => {
      alive = false;
    };
  }, [adapter, origin.mode, returnTo, onAuthed]);

  const goIsolated = async () => {
    if (!loopback) return;
    rememberIsolatedQa(true);
      window.location.replace(`${navHref("/login")}?isolatedQa=1&next=${encodeURIComponent(returnTo)}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busyRef.current || busy) return;
    setError("");
    if (origin.mode === "waiting") {
      setError(COPY.loginWaiting);
      return;
    }
    if (origin.mode === "live") {
      if (!id.trim() || !pw) {
        setError("이메일과 비밀번호를 입력해 주세요.");
        return;
      }
      busyRef.current = true;
      setBusy(true);
      const result = await adapter.login(id.trim(), pw);
      busyRef.current = false;
      setBusy(false);
      if (!result.ok) {
        if (result.code === "STORE_UNREADY") setError(COPY.loginStoreUnready);
        else setError(result.message);
        return;
      }
      if (!result.data.connected) {
        setError(COPY.loginStoreUnready);
        return;
      }
      const next = returnTo.startsWith("/") ? returnTo : "/";
      window.location.assign(next);
      onAuthed();
      return;
    }
    if (!id.trim()) {
      setError("시험 계정 이름을 입력해 주세요.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    const result = await adapter.isolatedLogin(id.trim());
    busyRef.current = false;
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    rememberIsolatedQa(true);
    const next = returnTo.startsWith("/") ? returnTo : "/";
    window.location.assign(next);
    onAuthed();
  };

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="login-logo">퍼</div>
        <p>PUTDUK OPERATIONS</p>
        <h1>
          서비스의 모든 순간을
          <br />
          안전하게 운영합니다.
        </h1>
        <div className="login-points">
          <span>
            <Check /> 정확한 회원을 찾은 뒤에만 변경
          </span>
          <span>
            <Check /> 위험한 작업은 한 번 더 확인
          </span>
          <span>
            <Check /> 서버가 확인하기 전에는 완료가 아님
          </span>
        </div>
        <small>
          {origin.mode === "isolated-qa" ? COPY.isolatedHint : "일반 사용자 로그인으로는 들어올 수 없어요."}
        </small>
      </section>
      <section className="login-form-wrap">
        <form className="login-card" onSubmit={submit} data-testid="login-form">
          <div className="login-mobile-logo">
            <span>퍼</span>
            <b>{COPY.brand}</b>
          </div>
          <p className="login-kicker">운영자 전용</p>
          <h2>{COPY.loginTitle}</h2>
          <p className="login-help">{COPY.loginHelp}</p>
          {origin.mode === "waiting" ? (
            <div className="demo-account" data-testid="login-waiting">
              <b>연결 대기</b>
              <p>{COPY.loginWaiting}</p>
            </div>
          ) : null}
          {origin.mode === "live" ? (
            <div className="demo-account" data-testid="login-live-hint">
              <b>비밀번호 로그인 준비 중</b>
              <p>
                현재 계약 경로 {CURRENT_CONTRACT_PATHS.adminSessionLogin} · 활성화 {CONTRACT_ACTIVATION.adminSessionLogin}.
                옛 문서 경로 {LEGACY_DOCUMENTED_PATHS.adminAuthLogin} 은 없습니다. 저장소가 준비되지 않으면 503이며
                완료가 아닙니다. 이미 운영자 세션이 같은 주소에 있으면 자동으로 들어갑니다.
              </p>
            </div>
          ) : null}
          <label>
            <span>{origin.mode === "live" ? "이메일" : "아이디"}</span>
            <input
              data-testid="login-id"
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoComplete="username"
              placeholder={origin.mode === "isolated-qa" ? "qa-super" : "운영자 이메일"}
            />
          </label>
          <label>
            <span>비밀번호</span>
            <div className="password">
              <input
                data-testid="login-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                type={show ? "text" : "password"}
                autoComplete="current-password"
                placeholder={origin.mode === "isolated-qa" ? "격리 시험에서는 쓰이지 않아요" : "비밀번호"}
                disabled={origin.mode === "isolated-qa"}
              />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"}>
                {show ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>
          {error ? (
            <p className="login-error" data-testid="login-error">
              <AlertTriangle />
              {error}
            </p>
          ) : null}
          <button
            className="login-submit"
            data-testid="login-submit"
            disabled={busy || origin.mode === "waiting"}
          >
            {busy ? "확인하는 중…" : origin.mode === "isolated-qa" ? "격리 시험 들어가기" : "로그인"}
          </button>
          {loopback && origin.mode !== "isolated-qa" ? (
            <div className="demo-account">
              <b>이 컴퓨터에서만 시험할 수 있어요.</b>
              <p>{COPY.isolatedAccounts}</p>
              <button type="button" className="textbtn" onClick={goIsolated} data-testid="login-isolated-on">
                격리 시험 모드 켜기
              </button>
            </div>
          ) : null}
          {origin.mode === "isolated-qa" ? (
            <div className="demo-account">
              <b>격리 시험 계정</b>
              <p>{COPY.isolatedAccounts}. 실제 운영 비밀번호가 아닙니다.</p>
            </div>
          ) : null}
        </form>
      </section>
    </main>
  );
}
