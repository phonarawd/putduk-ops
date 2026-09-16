import { ADMIN_ROLE_LABEL_KO, isAdminRole, MEMBERSHIP_LABEL_KO, type MembershipId } from "./contract.ts";

export function roleLabelKo(role: string | undefined): string {
  if (!role) return "확인 중";
  if (isAdminRole(role)) return ADMIN_ROLE_LABEL_KO[role];
  return "운영자";
}

export function membershipLabelKo(id: string): string {
  return MEMBERSHIP_LABEL_KO[id as MembershipId] ?? "등급 확인 중";
}

export function quotaSourceLabelKo(source: string | undefined): string {
  const key = (source ?? "").trim();
  if (key === "explicit" || key === "admin_override" || key === "user_override") return "이 회원만 따로 지정";
  if (key === "grade" || key === "grade_cap" || key === "membership") return "등급 기본값";
  if (key === "signup" || key === "signup_default" || key === "new_signup") return "신규 가입 기본";
  if (key === "compiled" || key === "compiled_default") return "등급 기본값";
  if (!key) return "확인 중";
  return "서버가 정한 기준";
}

export function storeStatusLabelKo(status: string | undefined): string {
  if (status === "ready") return "저장 가능";
  if (status === "unready") return "아직 준비 중";
  return "확인 중";
}

export function grantStatusLabelKo(status: string | undefined): string {
  const key = (status ?? "").toLowerCase();
  if (key === "active" || key === "open") return "사용 가능";
  if (key === "reclaimed") return "회수됨";
  if (key === "exhausted" || key === "used") return "모두 사용";
  if (key === "expired") return "만료";
  if (!key) return "확인 중";
  return "처리됨";
}

export function formatUsdt(amount: string | undefined | null): string {
  const raw = (amount ?? "").trim();
  if (!raw) return "없음";
  return `${raw} USDT`;
}

export function formatWon(amount: string | undefined | null): string {
  const raw = (amount ?? "").trim();
  if (!raw) return "없음";
  return `${raw}원`;
}
