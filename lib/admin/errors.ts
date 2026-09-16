export type AdminFailureCode =
  | "ADMIN_AUTH_REQUIRED"
  | "ADMIN_AUTH_INVALID"
  | "ADMIN_CSRF_INVALID"
  | "ADMIN_CAPABILITY_DENIED"
  | "ADMIN_ROLE_UNKNOWN"
  | "ADMIN_AUTH_LOGIN_UNIMPLEMENTED"
  | "ADMIN_USERS_LIST_UNIMPLEMENTED"
  | "CONNECTION_WAITING"
  | "CROSS_ORIGIN_COOKIE"
  | "STORE_UNREADY"
  | "REVISION_CONFLICT"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "UNKNOWN_UNAVAILABLE"
  | "USER_MISMATCH"
  | "BUSY";

export type AdminResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; code: AdminFailureCode; message: string; applied: false; raw?: unknown };

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readFiniteInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isInteger(n) && Number.isFinite(n)) return n;
  }
  return null;
}

export function failure(
  status: number,
  code: AdminFailureCode,
  message: string,
  raw?: unknown,
): AdminResult<never> {
  return { ok: false, status, code, message, applied: false, raw };
}

export function mapHttpFailure(status: number, body: unknown): AdminResult<never> {
  const row = asRecord(body);
  const nested = row ? asRecord(row.message) ?? row : null;
  const codeRaw = readString(nested?.code) ?? readString(row?.code) ?? "";
  const messageRaw =
    readString(nested?.message) ??
    (typeof row?.message === "string" ? row.message : null) ??
    readString(nested?.error) ??
    "";

  if (status === 401) {
    if (codeRaw === "ADMIN_CSRF_INVALID" || messageRaw.includes("ADMIN_CSRF")) {
      return failure(status, "ADMIN_CSRF_INVALID", "보안 확인이 맞지 않아 저장하지 않았어요.", body);
    }
    if (codeRaw === "ADMIN_AUTH_INVALID" || messageRaw.includes("ADMIN_AUTH_INVALID")) {
      return failure(status, "ADMIN_AUTH_INVALID", "운영자 로그인이 만료되었거나 유효하지 않아요.", body);
    }
    return failure(status, "ADMIN_AUTH_REQUIRED", "운영자 로그인이 필요해요.", body);
  }
  if (status === 403) {
    return failure(status, "ADMIN_CAPABILITY_DENIED", "이 작업 권한이 없어요. 서버가 거절했습니다.", body);
  }
  if (status === 404) {
    return failure(status, "NOT_FOUND", "찾을 수 없어요. 다른 대상으로 바꾸지 않았어요.", body);
  }
  if (status === 409 || codeRaw === "REVISION_CONFLICT") {
    return failure(status, "REVISION_CONFLICT", "다른 직원이 먼저 바꿔서 저장하지 않았어요. 다시 불러와 주세요.", body);
  }
  if (codeRaw === "USER_MISMATCH") {
    return failure(
      status || 409,
      "USER_MISMATCH",
      "응답 회원 번호가 요청과 달라 화면에 넣지 않았어요. 다른 회원으로 바꾸지 않았어요.",
      body,
    );
  }
  if (status === 503 || codeRaw === "STORE_UNREADY") {
    return failure(
      status,
      "STORE_UNREADY",
      "저장소가 아직 준비되지 않아 적용하지 않았어요. 완료로 표시하지 않아요.",
      body,
    );
  }
  if (status === 400) {
    return failure(status, "INVALID_INPUT", operatorInputMessage(messageRaw || codeRaw), body);
  }
  if (status === 0) {
    return failure(status, "CONNECTION_WAITING", "운영 서버에 아직 연결하지 않았어요.", body);
  }
  return failure(status, "UNKNOWN_UNAVAILABLE", "결과를 확인할 수 없어요. 추측 숫자로 채우지 않았어요.", body);
}

function operatorInputMessage(raw: string): string {
  if (raw.includes("reason")) return "변경 이유는 10자 이상 적어 주세요.";
  if (raw.includes("uuid")) return "회원 번호는 정확한 회원 식별 값이어야 해요.";
  if (raw.includes("INVALID_DURATION") || raw.includes("atSec")) {
    return "화면 진행 초가 규칙에 맞지 않아요.";
  }
  if (raw.includes("LOCKED_STEPS") || raw.includes("five-step")) {
    return "실행 정책 5단계는 화면 진행 시간으로 쓸 수 없어요.";
  }
  if (raw.includes("at")) return "시간 칸은 시작 초만 쓸 수 있어요.";
  return "입력 값을 다시 확인해 주세요.";
}

export function unknownUnavailable(): AdminResult<never> {
  return failure(0, "UNKNOWN_UNAVAILABLE", "조회에 실패했어요. 0회나 기본 5회로 대신 보여 주지 않아요.");
}

export function userMismatch(): AdminResult<never> {
  return failure(
    409,
    "USER_MISMATCH",
    "응답 회원 번호가 요청과 달라 화면에 넣지 않았어요. 다른 회원으로 바꾸지 않았어요.",
  );
}

export function connectionWaiting(detail?: string): AdminResult<never> {
  return failure(
    0,
    "CONNECTION_WAITING",
    detail ?? "운영자 서버 주소가 아직 정해지지 않아 연결을 기다립니다.",
  );
}
