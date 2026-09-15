export const ADMIN_BASE = "/admin";

/** URL path → 화면 논리 경로 (`/`, `/login`, `/products`) */
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

export function loginHref(next?: string): string {
  const dest = next && next.startsWith("/") ? next : adminHref("/");
  const login = adminHref("/login");
  if (!next || dest === login || dest === ADMIN_BASE) return login;
  return `${login}?next=${encodeURIComponent(dest)}`;
}
