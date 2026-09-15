import { connectionWaiting, type AdminResult } from "./errors.ts";

const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

export type ConnectionMode = "isolated-qa" | "live" | "waiting";

export type OriginDecision = {
  mode: ConnectionMode;
  apiOrigin: string | null;
  reason: string;
  sameOrigin: boolean;
  loopback: boolean;
};

function envText(name: string): string | null {
  const value =
    (typeof process !== "undefined" ? process.env[name] : undefined) ??
    (typeof process !== "undefined" ? process.env[`NEXT_PUBLIC_${name}`] : undefined);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK.has(hostname);
}

export function currentHostname(): string {
  if (typeof window === "undefined") return "127.0.0.1";
  return window.location.hostname;
}

export function isolatedQaRequested(): boolean {
  const envOn =
    envText("PUTDUK_OPS_ISOLATED_QA") === "1" ||
    envText("NEXT_PUBLIC_PUTDUK_OPS_ISOLATED_QA") === "1";
  let pageOn = false;
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    pageOn =
      params.get("isolatedQa") === "1" ||
      window.sessionStorage.getItem("putduk_ops_isolated_qa") === "1";
  }
  return envOn || pageOn;
}

export function isIsolatedQaActive(): boolean {
  return isLoopbackHost(currentHostname()) && isolatedQaRequested();
}

export function rememberIsolatedQa(on: boolean): void {
  if (typeof window === "undefined") return;
  if (!isLoopbackHost(window.location.hostname)) return;
  if (on) window.sessionStorage.setItem("putduk_ops_isolated_qa", "1");
  else window.sessionStorage.removeItem("putduk_ops_isolated_qa");
}

/**
 * 운영 API 주소를 추측하지 않는다.
 * 문서의 api.hiptk.app은 안내일 뿐이며, 환경 값이 있을 때만 산다.
 */
export function resolveOrigin(): OriginDecision {
  const loopback = isLoopbackHost(currentHostname());
  if (isIsolatedQaActive()) {
    return {
      mode: "isolated-qa",
      apiOrigin: "mock://isolated-qa",
      reason: "루프백 격리 시험 모드입니다. 실제 회원·운영 API는 쓰지 않아요.",
      sameOrigin: true,
      loopback,
    };
  }

  if (typeof window !== "undefined" && !loopback) {
    return {
      mode: "live",
      apiOrigin: window.location.origin,
      reason: "같은 주소에서 운영자 세션 쿠키를 사용합니다.",
      sameOrigin: true,
      loopback,
    };
  }

  const configured = envText("PUTDUK_ADMIN_API_ORIGIN") ?? envText("NEXT_PUBLIC_PUTDUK_ADMIN_API_ORIGIN");
  if (!configured) {
    return {
      mode: "waiting",
      apiOrigin: null,
      reason:
        "운영자 API 주소가 설정되지 않았어요. 주소를 추측해 연결하지 않습니다.",
      sameOrigin: false,
      loopback,
    };
  }

  let apiUrl: URL;
  try {
    apiUrl = new URL(configured);
  } catch {
    return {
      mode: "waiting",
      apiOrigin: null,
      reason: "운영자 API 주소 형식이 올바르지 않아요.",
      sameOrigin: false,
      loopback,
    };
  }

  const pageOrigin =
    typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1";
  let pageUrl: URL;
  try {
    pageUrl = new URL(pageOrigin);
  } catch {
    pageUrl = new URL("http://127.0.0.1");
  }
  const sameOrigin = pageUrl.origin === apiUrl.origin;
  return {
    mode: "live",
    apiOrigin: apiUrl.origin,
    reason: sameOrigin
      ? "같은 주소에서 운영자 세션 쿠키를 사용합니다."
      : "다른 주소라 운영자 쿠키·보안 헤더를 브라우저가 읽지 못할 수 있어요.",
    sameOrigin,
    loopback,
  };
}

export function waitingIfNotLive(): AdminResult<never> | null {
  const origin = resolveOrigin();
  if (origin.mode === "waiting") return connectionWaiting(origin.reason);
  return null;
}
