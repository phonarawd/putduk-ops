"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronDown,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { createAdminAdapter, sessionLabel } from "../lib/admin/adapter";
import { COPY } from "../lib/admin/copy";
import { appPath, navHref } from "../lib/admin-routes";
import { rememberIsolatedQa, resolveOrigin, type OriginDecision } from "../lib/admin/origin";
import type { AdminSession } from "../lib/admin/types";
import { CatalogScreen } from "./admin-screens/catalog-screen";
import {
  Content,
  Conversation,
  Conversations,
  DraftUserExtras,
  History,
  Identity,
  Money,
  Reports,
  Safety,
  Service,
  Staff,
  Support,
} from "./admin-screens/draft-screens";
import { GradesScreen } from "./admin-screens/grades-screen";
import { LoginScreen } from "./admin-screens/login-screen";
import { MembershipWorkspace, UsersSearch } from "./admin-screens/membership-screen";
import { PresentationScreen } from "./admin-screens/presentation-screen";
import { QaBanner, WaitBanner } from "./admin-screens/shared";

const groups = [
  { label: "상품 목록", href: "/", icon: Package },
  {
    label: "회원과 상담",
    href: "/users",
    icon: UsersRound,
    children: [
      ["회원 찾기", "/users"],
      ["등급별 하루 기회", "/membership/grades"],
      ["문의함", "/support"],
      ["퍼뜩 AI 대화", "/conversations/ai"],
    ],
  },
  {
    label: "돈과 거래",
    href: "/money/withdrawals",
    icon: WalletCards,
    children: [
      ["입금 확인", "/money/deposits"],
      ["출금 요청", "/money/withdrawals"],
      ["전체 거래", "/money/transactions"],
      ["맞지 않는 금액", "/money/mismatches"],
    ],
  },
  { label: "본인 확인", href: "/identity", icon: UserRoundCheck },
  {
    label: "공지와 이벤트",
    href: "/content/notices",
    icon: Sparkles,
    children: [
      ["공지사항", "/content/notices"],
      ["이벤트", "/content/events"],
      ["혜택", "/content/benefits"],
      ["배너", "/content/banners"],
      ["알림 보내기", "/content/messages"],
    ],
  },
  {
    label: "안전 관리",
    href: "/safety/alerts",
    icon: ShieldCheck,
    children: [
      ["이상한 이용", "/safety/alerts"],
      ["검토 사건", "/safety/cases"],
      ["차단 목록", "/safety/lists"],
      ["이용 한도", "/safety/limits"],
    ],
  },
  { label: "운영 현황", href: "/reports", icon: Activity },
  {
    label: "직원과 기록",
    href: "/staff",
    icon: ClipboardCheck,
    children: [
      ["직원", "/staff"],
      ["승인 요청", "/staff/approvals"],
      ["작업 기록", "/activity"],
      ["열람 기록", "/activity/access"],
    ],
  },
  {
    label: "서비스 설정",
    href: "/service",
    icon: Settings,
    children: [
      ["서비스 상태", "/service"],
      ["화면 진행 시간", "/service/display-timing"],
      ["진행 중인 문제", "/service/incidents"],
      ["점검 일정", "/service/maintenance"],
      ["기능 켜기·끄기", "/service/controls"],
    ],
  },
];

function returnToFrom(route: string): string {
  if (typeof window === "undefined") return route === "/login" ? navHref("/") : navHref(route);
  const next = new URLSearchParams(window.location.search).get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return route === "/login" ? navHref("/") : navHref(route);
}

function loginHref(route: string): string {
  const next = route === "/login" ? "/" : route;
  const origin = resolveOrigin();
  const qa = origin.mode === "isolated-qa" ? "&isolatedQa=1" : "";
  return `${navHref("/login")}?next=${encodeURIComponent(navHref(next))}${qa}`;
}

function useAppRoute(initialRoute: string): string {
  const [pop, setPop] = useState(0);
  useEffect(() => {
    const onPop = () => setPop((n) => n + 1);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  if (typeof window !== "undefined" && pop > 0) {
    return appPath(window.location.pathname || initialRoute);
  }
  return appPath(initialRoute);
}

function subscribeNoop() {
  return () => {};
}

export function AdminApp({ route: initialRoute }: { route: string }) {
  const booted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const origin = resolveOrigin();
  const adapter = useMemo(() => (booted ? createAdminAdapter() : null), [booted]);
  const route = useAppRoute(initialRoute);
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [filter, setFilter] = useState("전체");
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<AdminSession>({ connected: false, mode: origin.mode });

  useEffect(() => {
    if (!adapter) return;
    let alive = true;
    void adapter.session().then((res) => {
      if (!alive) return;
      if (res.ok) setSession(res.data);
      else setSession({ connected: false, mode: origin.mode });
      setAuthReady(true);
    });
    return () => {
      alive = false;
    };
  }, [adapter, origin.mode, route]);

  const notify = (s: string, ok = true) => {
    setToast({ message: s, ok });
    window.setTimeout(() => setToast(null), 2600);
  };

  const go = (href: string) => {
    setMobile(false);
    window.location.assign(navHref(href));
  };

  if (!booted || !adapter) return <main className="auth-loading">운영자 로그인 확인 중…</main>;

  if (route === "/login") {
    return (
      <LoginScreen
        adapter={adapter}
        returnTo={returnToFrom(route)}
        onAuthed={() => setAuthReady(true)}
      />
    );
  }
  if (!authReady) return <main className="auth-loading">운영자 로그인 확인 중…</main>;
  if (!session.connected) {
    if (typeof window !== "undefined") window.location.replace(loginHref(route));
    return <main className="auth-loading">로그인 화면으로 이동 중…</main>;
  }

  const known = isKnownRoute(route);
  const active =
    groups.find((g) => route === g.href || g.children?.some(([, h]) => route === h || (h !== "/" && route.startsWith(`${h}/`)))) ||
    (known ? groups[0] : { label: "없는 화면", href: route, icon: LayoutDashboard });
  const all = [...groups.flatMap((g) => [...(g.children || []), [g.label, g.href]])];
  const title = (all.find(([, h]) => h === route)?.[0] ||
    (route.startsWith("/users/")
      ? "회원 기회·등급"
      : route.startsWith("/conversations/ai/")
        ? "AI 대화 상세"
        : route === "/catalog"
          ? "상품 목록"
          : known
            ? "상품 목록"
            : "없는 화면")) as string;
  const who = sessionLabel(session);
  const userId = route.startsWith("/users/") ? decodeURIComponent(route.split("/").pop() || "") : "";

  return (
    <div className="admin">
      <aside className={`side ${mobile ? "open" : ""}`}>
        <div className="brand">
          <span>퍼</span>
          <div>
            <b>{COPY.brand}</b>
            <small>{brandModeLabel(origin)}</small>
          </div>
          <button type="button" onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>
        <nav>
          {groups.map((g) => {
            const I = g.icon;
            const on = active.label === g.label;
            return (
              <div key={g.label}>
                <Link
                  className={on ? "on" : ""}
                  href={navHref(g.href)}
                  onClick={(e) => {
                    e.preventDefault();
                    go(g.href);
                  }}
                >
                  <I />
                  <span>{g.label}</span>
                  {g.children ? <ChevronDown /> : null}
                </Link>
                {on && g.children ? (
                  <div className="sub">
                    {g.children.map(([l, h]) => (
                      <Link
                        key={h}
                        className={route === h ? "on" : ""}
                        href={navHref(h)}
                        onClick={(e) => {
                          e.preventDefault();
                          go(h);
                        }}
                      >
                        {l}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
        <div className="me">
          <span>{who.name[0] ?? "운"}</span>
          <div>
            <b>{who.name}</b>
            <small>{who.role}</small>
          </div>
          <Link
            href={navHref("/login")}
            aria-label="로그아웃"
            data-testid="logout"
            onClick={(e) => {
              e.preventDefault();
              void adapter.logout().then(() => {
                rememberIsolatedQa(false);
                window.location.assign(navHref("/login"));
              });
            }}
          >
            <LogOut />
          </Link>
        </div>
      </aside>
      {mobile ? <button className="scrim" type="button" onClick={() => setMobile(false)} /> : null}
      <main>
        <header>
          <button className="menub" type="button" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <div className="crumb">
            <span>{COPY.brand}</span>
            <b>{title}</b>
          </div>
          <div className="topright">
            {origin.mode === "isolated-qa" && adapter.setStoreReady ? (
              <button
                type="button"
                className="ops-mini"
                data-testid="qa-store-ready"
                onClick={() => {
                  adapter.setStoreReady?.(true);
                  notify("연습용 저장소를 준비됨으로 바꿨어요. 실제 운영 저장이 아닙니다.");
                }}
              >
                연습 저장소 켜기
              </button>
            ) : null}
            <span className={`healthy ${healthTone(origin, session)}`} data-testid="header-health">
              <i />
              {healthCaption(origin, session)}
            </span>
          </div>
        </header>
        <div className="body">
          {origin.mode === "isolated-qa" ? <QaBanner>{COPY.isolatedHint}</QaBanner> : null}
          {origin.mode === "waiting" ? <WaitBanner>{origin.reason}</WaitBanner> : null}
          <div className="pagehead">
            <div>
              <small>{active.label}</small>
              <h1 data-testid="page-title">{title}</h1>
              <p>{description(route)}</p>
            </div>
          </div>
          {route === "/" || route === "/catalog" ? <CatalogScreen adapter={adapter} notify={notify} /> : null}
          {route === "/users" ? <UsersSearch adapter={adapter} /> : null}
          {route.startsWith("/users/") ? (
            <>
              <MembershipWorkspace key={userId} userId={userId} adapter={adapter} notify={notify} />
              <DraftUserExtras />
            </>
          ) : null}
          {route === "/membership/grades" ? <GradesScreen adapter={adapter} notify={notify} /> : null}
          {route === "/conversations/ai" ? (
            <Conversations q={query} setQ={setQuery} filter={filter} setFilter={setFilter} />
          ) : null}
          {route.startsWith("/conversations/ai/") ? <Conversation /> : null}
          {route.startsWith("/money/") ? <Money route={route} /> : null}
          {route === "/identity" ? <Identity /> : null}
          {route.startsWith("/content/") ? <Content route={route} /> : null}
          {route.startsWith("/safety/") ? <Safety route={route} /> : null}
          {route === "/reports" ? <Reports /> : null}
          {route.startsWith("/support") ? <Support /> : null}
          {route === "/staff" || route === "/staff/approvals" ? <Staff approval={route.includes("approvals")} /> : null}
          {route.startsWith("/activity") ? <History access={route.includes("access")} /> : null}
          {route === "/service/display-timing" ? <PresentationScreen adapter={adapter} notify={notify} /> : null}
          {route.startsWith("/service") && route !== "/service/display-timing" ? <Service route={route} /> : null}
          {!known ? (
            <section className="panel" data-testid="missing-route">
              <div className="panelhead">
                <div>
                  <h2>없는 화면</h2>
                  <p>{COPY.missingRoute}</p>
                </div>
              </div>
              <p className="ops-hint">주소 {route}</p>
            </section>
          ) : null}
        </div>
      </main>
      {toast ? (
        <div className={`toast ${toast.ok ? "toast-ok" : "toast-fail"}`} data-testid="admin-toast" data-ok={toast.ok ? "true" : "false"}>
          {toast.ok ? <Check /> : <AlertTriangle />}
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

function description(r: string) {
  if (!isKnownRoute(r)) return COPY.missingRoute;
  if (r === "/" || r === "/catalog") return "상품 이름과 세 가지 금액, 공개 범위만 보면 됩니다.";
  if (r === "/users") return "회원 번호로 한 명만 찾습니다. 없는 번호는 다른 회원으로 바꾸지 않아요.";
  if (r.startsWith("/users/")) return "하루 기회, 추가 지급, 등급만 바꿉니다. 서버가 확인한 결과만 완료입니다.";
  if (r === "/membership/grades") return "등급마다 하루 기본 기회를 정합니다. 이미 따로 지정된 회원은 그대로 둡니다.";
  if (r === "/support") return "전체 문의함은 아직 없습니다. 회원을 먼저 찾아 주세요.";
  if (r === "/conversations/ai" || r.startsWith("/conversations/ai/")) return "실제 대화는 권한이 확인되기 전에는 열지 않아요.";
  if (r === "/money/deposits") return "입금 확인 목록이 아직 연결되지 않았어요.";
  if (r === "/money/withdrawals") return "출금 요청이 아직 연결되지 않았어요.";
  if (r === "/money/transactions") return "거래 내역이 아직 연결되지 않았어요.";
  if (r === "/money/mismatches") return "맞지 않는 금액 목록이 아직 연결되지 않았어요.";
  if (r === "/identity") return "본인 확인 대기함이 아직 연결되지 않았어요.";
  if (r === "/content/notices") return "공지사항 작성이 아직 연결되지 않았어요.";
  if (r === "/content/events") return "이벤트 등록이 아직 연결되지 않았어요.";
  if (r === "/content/benefits") return "혜택 관리가 아직 연결되지 않았어요.";
  if (r === "/content/banners") return "배너 관리가 아직 연결되지 않았어요.";
  if (r === "/content/messages") return "알림 보내기가 아직 연결되지 않았어요.";
  if (r === "/safety/alerts") return "이상한 이용 알림이 아직 연결되지 않았어요.";
  if (r === "/safety/cases") return "검토 사건이 아직 연결되지 않았어요.";
  if (r === "/safety/lists") return "차단 목록이 아직 연결되지 않았어요.";
  if (r === "/safety/limits") return "이용 한도는 아직 연결되지 않았어요. 회원별로 하루 기회는 바꿀 수 있어요.";
  if (r === "/reports") return "운영 숫자는 확인할 수 없어요. 가짜 차트를 넣지 않았어요.";
  if (r === "/staff") return "직원 목록이 아직 연결되지 않았어요.";
  if (r === "/staff/approvals") return "승인 요청이 아직 연결되지 않았어요.";
  if (r === "/activity") return "작업 기록이 아직 연결되지 않았어요.";
  if (r === "/activity/access") return "열람 기록이 아직 연결되지 않았어요.";
  if (r === "/service") return "서비스가 정상인지 지금은 확인할 수 없어요.";
  if (r === "/service/display-timing") return "회원 화면에 보이는 진행 시간만 바꿉니다. 돈과 횟수는 그대로입니다.";
  if (r === "/service/incidents") return "진행 중인 문제 목록이 아직 연결되지 않았어요.";
  if (r === "/service/maintenance") return "점검 일정이 아직 연결되지 않았어요.";
  if (r === "/service/controls") return "기능 켜기·끄기가 아직 연결되지 않았어요.";
  return "필요한 정보를 찾은 뒤에만 바꾸고, 서버가 확인한 결과만 완료로 봅니다.";
}

const KNOWN_EXACT = new Set([
  "/",
  "/users",
  "/catalog",
  "/membership/grades",
  "/support",
  "/conversations/ai",
  "/identity",
  "/reports",
  "/staff",
  "/staff/approvals",
  "/activity",
  "/activity/access",
  "/service",
  "/service/display-timing",
  "/service/incidents",
  "/service/maintenance",
  "/service/controls",
]);

const KNOWN_PREFIX = ["/users/", "/conversations/ai/", "/money/", "/content/", "/safety/"];

export function isKnownRoute(route: string): boolean {
  if (KNOWN_EXACT.has(route)) return true;
  return KNOWN_PREFIX.some((prefix) => route.startsWith(prefix) && route.length > prefix.length);
}

function brandModeLabel(origin: OriginDecision): string {
  if (origin.mode === "isolated-qa") return "격리 시험";
  if (origin.mode === "waiting") return "연결 대기";
  return "운영 연결";
}

function healthCaption(origin: OriginDecision, session: AdminSession): string {
  if (origin.mode === "isolated-qa") return "격리 시험 중";
  if (origin.mode === "waiting") return "연결 대기";
  if (origin.mode === "live" && session.connected) {
    return origin.sameOrigin ? "운영 세션 연결됨" : "운영 세션·다른 주소 확인 필요";
  }
  return "운영 연결 확인 필요";
}

function healthTone(origin: OriginDecision, session: AdminSession): string {
  if (origin.mode === "isolated-qa") return "healthy-qa";
  if (origin.mode === "waiting") return "healthy-wait";
  if (origin.mode === "live" && session.connected && origin.sameOrigin) return "healthy-live";
  return "healthy-need";
}
