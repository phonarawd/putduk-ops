import {
  ADMIN_CSRF_COOKIE_NAME,
  ADMIN_CSRF_HEADER,
  API_PREFIX,
} from "./contract.ts";
import { asRecord, connectionWaiting, failure, mapHttpFailure, type AdminResult } from "./errors.ts";
import { resolveOrigin } from "./origin.ts";

function readCsrfCookie(): string {
  if (typeof document === "undefined") return "";
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const [name, ...rest] = part.trim().split("=");
    if (name === ADMIN_CSRF_COOKIE_NAME) return decodeURIComponent(rest.join("="));
  }
  return "";
}

export async function adminFetch<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: { csrf?: boolean; headers?: Record<string, string> },
): Promise<AdminResult<T>> {
  const origin = resolveOrigin();
  if (origin.mode !== "live" || !origin.apiOrigin) {
    return connectionWaiting(origin.reason);
  }
  const write = /^(POST|PUT|PATCH|DELETE)$/i.test(method);
  const useCsrf = opts?.csrf !== false;
  if (write && !origin.sameOrigin) {
    return failure(
      0,
      "CROSS_ORIGIN_COOKIE",
      "다른 주소에서는 운영자 보안 확인 값을 읽을 수 없어 저장하지 않았어요.",
    );
  }

  const headers: Record<string, string> = {
    accept: "application/json",
    ...(opts?.headers ?? {}),
  };
  if (write) {
    headers["content-type"] = "application/json";
    if (useCsrf) {
      const csrf = readCsrfCookie();
      if (!csrf) {
        return failure(401, "ADMIN_CSRF_INVALID", "보안 확인 값이 없어 저장하지 않았어요.");
      }
      headers[ADMIN_CSRF_HEADER] = csrf;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${origin.apiOrigin}${API_PREFIX}${path}`, {
      method,
      credentials: "include",
      headers,
      body: write ? JSON.stringify(body ?? {}) : undefined,
    });
  } catch {
    return connectionWaiting("운영 서버에 닿지 않았어요. 추측 값으로 채우지 않았어요.");
  }

  let parsed: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { message: text };
    }
  }
  if (!response.ok) return mapHttpFailure(response.status, parsed);
  return { ok: true, status: response.status, data: parsed as T };
}

export function unwrapApplied(row: unknown): boolean {
  const rec = asRecord(row);
  if (!rec) return false;
  if (rec.applied === false) return false;
  if (rec.storeStatus === "unready") return false;
  return rec.applied === true;
}
