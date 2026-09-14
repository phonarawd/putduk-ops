/**
 * 회원 대상 응답만 요청 UUID와 대조한다.
 * 공용 상품·등급 정책 응답에 userId를 요구하지 않는다.
 */

import { sameUserId } from "./contract.ts";
import { readString, userMismatch, type AdminResult } from "./errors.ts";

/** 응답에 userId가 있을 때만 대조. 없으면 세대 토큰이 화면 레이스를 막는다. */
export function assertScopedUserId(
  responseUserId: string | null | undefined,
  requested: string,
): AdminResult<true> {
  if (!responseUserId) return { ok: true, status: 200, data: true };
  if (!sameUserId(responseUserId, requested)) return userMismatch();
  return { ok: true, status: 200, data: true };
}

export function readScopedUserId(row: unknown, field = "userId"): string | null {
  if (!row || typeof row !== "object") return null;
  return readString((row as Record<string, unknown>)[field]);
}
