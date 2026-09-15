export const ADMIN_BASE = "/admin";

/** URL path → 화면 논리 경로 (`/`, `/login`, `/catalog`) */
export function appPath(route: string): string {
  const raw = route.length > 1 ? route.replace(/\/+$/, "") : route || "/";
  if (raw === ADMIN_BASE) return "/";
  if (raw.startsWith(`${ADMIN_BASE}/`)) {
    const rest = raw.slice(ADMIN_BASE.length);
    return rest || "/";
  }
  return raw || "/";
}

/** 논리 경로 → 운영 사이트 주소 (`/admin`, `/admin/login`) */
export function adminHref(logical: string): string {
  const path = logical.startsWith("/") ? logical : `/${logical}`;
  if (path === "/" || path === ADMIN_BASE) return ADMIN_BASE;
  if (path.startsWith(`${ADMIN_BASE}/`)) return path;
  return `${ADMIN_BASE}${path}`;
}

/** 루프백 격리는 `/login`, 운영 호스트는 `/admin/login` */
export function navHref(logical: string): string {
  const path = logical.startsWith("/") ? logical : `/${logical}`;
  if (typeof window === "undefined") return path;
  const host = window.location.hostname;
  const loopback = host === "127.0.0.1" || host === "localhost" || host === "[::1]" || host === "::1";
  const underAdmin =
    window.location.pathname === ADMIN_BASE || window.location.pathname.startsWith(`${ADMIN_BASE}/`);
  if (underAdmin || !loopback) return adminHref(path);
  return path;
}
