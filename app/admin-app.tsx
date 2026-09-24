"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Sparkles,
  Sun,
  Moon,
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
import { CmsScreen } from "./admin-screens/cms-screen";
import {
  Conversation,
  Conversations,
  History,
  Money,
  Reports,
  Safety,
  Service,
  Staff,
  Support,
} from "./admin-screens/draft-screens";
import { GradesScreen } from "./admin-screens/grades-screen";
import { KycQueue } from "./admin-screens/kyc-screen";
import { LoginScreen } from "./admin-screens/login-screen";
import { MemberLiveExtras } from "./admin-screens/member-live-extras";
import { MembershipWorkspace, UsersSearch } from "./admin-screens/membership-screen";
import { MiningScreen } from "./admin-screens/mining-screen";
import { DepositGuideScreen, KrwDepositQueue, WithdrawQueue } from "./admin-screens/money-live-screen";
import { PresentationScreen } from "./admin-screens/presentation-screen";
import { QaBanner, WaitBanner } from "./admin-screens/shared";

const groups = [
  { label: "오늘 할 일", href: "/", icon: LayoutDashboard },
  { label: "광산 관리", href: "/mine/mines", icon: Package },
  { label: "수익률 관리", href: "/mine/rates", icon: Sparkles },
  { label: "운용 현황", href: "/mine/positions", icon: UsersRound },
  { label: "정산 관리", href: "/mine/settlements", icon: WalletCards },
  { label: "시스템 제어", href: "/mine/system", icon: Settings },
  {
    label: "회원",
    href: "/users",
    icon: UsersRound,
    children: [["회원 목록", "/users"]],
  },
  {
    label: "입출금",
    href: "/money/deposits",
    icon: WalletCards,
    children: [
      ["입금 확인", "/money/deposits"],
      ["출금 요청", "/money/withdrawals"],
      ["입금 안내", "/money/deposit-guide"],
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
];

const foldedGroups = [
  {
    label: "기존 운영 기반",
    href: "/catalog",
    icon: ClipboardCheck,
    children: [
      ["기존 상품 목록", "/catalog"],
      ["기존 등급 설정", "/membership/grades"],
      ["화면 진행 시간", "/service/display-timing"],
      ["문의함", "/support"],
      ["퍼뜩 AI 대화", "/conversations/ai"],
      ["전체 거래", "/money/transactions"],
      ["맞지 않는 금액", "/money/mismatches"],
      ["이상한 이용", "/safety/alerts"],
      ["운영 현황", "/reports"],
      ["직원", "/staff"],
      ["작업 기록", "/activity"],
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
  const [foldOpen, setFoldOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<AdminSession>({ connected: false, mode: origin.mode });
  const [mineTheme, setMineTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("putduk-mine-theme");
    if (stored === "dark" || stored === "light") {
      setMineTheme(stored);
      return;
    }
    setMineTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.mineTheme = mineTheme;
    window.localStorage.setItem("putduk-mine-theme", mineTheme);
  }, [mineTheme]);

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

  const navGroups = [...groups, ...foldedGroups];
  const known = isKnownRoute(route);
  const active =
    navGroups.find((g) => route === g.href || g.children?.some(([, h]) => route === h || (h !== "/" && route.startsWith(`${h}/`)))) ||
    (known ? groups[0] : { label: "없는 화면", href: route, icon: LayoutDashboard });
  const all = [...navGroups.flatMap((g) => [...(g.children || []), [g.label, g.href]])];
  const title = (all.find(([, h]) => h === route)?.[0] ||
    (route.startsWith("/users/")
      ? "회원 상세"
      : route.startsWith("/conversations/ai/")
        ? "AI 대화 상세"
        : route === "/mine/today"
          ? "오늘 할 일"
          : known
            ? active.label
            : "없는 화면")) as string;
  const who = sessionLabel(session);
  const userId = route.startsWith("/users/") ? decodeURIComponent(route.split("/").pop() || "") : "";

  return (
    <div className={`admin mine-os-shell mine-theme-${mineTheme}`}>
      <aside className={`side ${mobile ? "open" : ""}`}>
        <div className="brand mine-brand">
          <span>◆</span>
          <div>
            <b>퍼뜩 채굴 운영센터</b>
            <small>운영 제어센터 · {brandModeLabel(origin)}</small>
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
          <button
            type="button"
            className="fold-toggle"
            data-testid="fold-toggle"
            onClick={() => setFoldOpen((v) => !v)}
          >
            {foldOpen ? "기존 운영 메뉴 접기" : "기존 운영 메뉴"}
          </button>
          {foldOpen
            ? foldedGroups.map((g) => {
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
                  </div>
                );
              })
            : null}
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
            <span>퍼뜩 채굴 운영센터</span>
            <b>{title}</b>
          </div>
          <div className="topright">
            <button
              type="button"
              className="mine-theme-toggle"
              aria-label={mineTheme === "dark" ? "밝은 화면으로 전환" : "어두운 화면으로 전환"}
              onClick={() => setMineTheme((current) => current === "dark" ? "light" : "dark")}
            >
              {mineTheme === "dark" ? <Sun /> : <Moon />}
              <span>{mineTheme === "dark" ? "밝은 화면" : "어두운 화면"}</span>
            </button>
            {origin.mode === "isolated-qa" && adapter.setStoreReady ? (
              <button
                type="button"
                className="ops-mini"
                data-testid="qa-store-ready"
                onClick={() => {
                  adapter.setStoreReady?.(true);
                  notify("격리 확인용 저장소를 준비 상태로 바꿨습니다. 운영 저장은 아닙니다.");
                }}
              >
                격리 확인 저장소 켜기
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
          <div className="pagehead mine-pagehead">
            <div>
              <small>{active.label}</small>
              <h1 data-testid="page-title">{title}</h1>
              <p>{description(route)}</p>
            </div>
          </div>
          {route === "/" || route.startsWith("/mine/") ? <MiningScreen route={route} adminId={session.adminId} notify={notify} /> : null}
          {route === "/catalog" ? <CatalogScreen adapter={adapter} notify={notify} /> : null}
          {route === "/users" ? <UsersSearch adapter={adapter} /> : null}
          {route.startsWith("/users/") ? (
            <>
              <MembershipWorkspace key={userId} userId={userId} adapter={adapter} notify={notify} />
              <MemberLiveExtras key={`${userId}-live`} userId={userId} adapter={adapter} />
            </>
          ) : null}
          {route === "/membership/grades" ? <GradesScreen adapter={adapter} notify={notify} /> : null}
          {route === "/conversations/ai" ? (
            <Conversations q={query} setQ={setQuery} filter={filter} setFilter={setFilter} />
          ) : null}
          {route.startsWith("/conversations/ai/") ? <Conversation /> : null}
          {route === "/money/deposit-guide" ? <DepositGuideScreen adapter={adapter} notify={notify} /> : null}
          {route === "/money/deposits" ? <KrwDepositQueue adapter={adapter} notify={notify} /> : null}
          {route === "/money/withdrawals" ? <WithdrawQueue adapter={adapter} notify={notify} /> : null}
          {route === "/money/transactions" || route === "/money/mismatches" ? <Money route={route} /> : null}
          {route === "/identity" ? <KycQueue adapter={adapter} notify={notify} /> : null}
          {route === "/content/notices" ? <CmsScreen kind="notice" adapter={adapter} notify={notify} /> : null}
          {route === "/content/events" ? <CmsScreen kind="event" adapter={adapter} notify={notify} /> : null}
          {route === "/content/benefits" ? <CmsScreen kind="benefit" adapter={adapter} notify={notify} /> : null}
          {route === "/content/banners" ? <CmsScreen kind="banner" adapter={adapter} notify={notify} /> : null}
          {route === "/content/messages" ? <CmsScreen kind="notification" adapter={adapter} notify={notify} /> : null}
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
  if (r === "/" || r === "/mine/today") return "입출금·본인확인·정산 이상·수익률 승인 등 오늘 확인할 광산 운영 업무입니다.";
  if (r === "/mine/mines") return "광산의 생성·수정·공개·중지·재개·종료를 실제 관리자 API로 처리합니다.";
  if (r === "/mine/rates") return "수익률 초안부터 작성자와 다른 승인자의 승인, 예약·적용까지 관리합니다.";
  if (r === "/mine/positions") return "사용자와 광산별 실제 운용 상태, 원금, 변경 이력을 조회합니다.";
  if (r === "/mine/settlements") return "정산 결과와 수익 발생 구간을 확인하고 실패·검토필요 건만 재실행합니다.";
  if (r === "/mine/system") return "전체 신규 운용과 정산을 서버 안전 제어로 중지하거나 해제합니다.";
  if (r === "/catalog") return "기존 상품 운영 화면입니다. 광산 운영과 분리해 보존합니다.";
  if (r === "/users") return "최근 가입 회원부터 보여 줍니다. 번호로 한 명만 찾을 수도 있어요.";
  if (r.startsWith("/users/")) return "회원의 기존 운영 정보와 입금 주소를 확인합니다. 서버가 확인한 결과만 완료입니다.";
  if (r === "/membership/grades") return "기존 등급 운영 기반을 보존합니다.";
  if (r === "/support") return "전체 문의함은 아직 없습니다. 회원을 먼저 찾아 주세요.";
  if (r === "/conversations/ai" || r.startsWith("/conversations/ai/")) return "실제 대화는 권한이 확인되기 전에는 열지 않아요.";
  if (r === "/money/deposit-guide") return "은행 이름·계좌·예금주는 직접 적습니다. 확인되지 않은 값을 채워 두지 않아요.";
  if (r === "/money/deposits") return "대기 중인 원 입금만 확인하고 거절합니다.";
  if (r === "/money/withdrawals") return "대기 중인 출금만 승인·거절합니다.";
  if (r === "/money/transactions") return "거래 내역이 아직 연결되지 않았어요.";
  if (r === "/money/mismatches") return "맞지 않는 금액 목록이 아직 연결되지 않았어요.";
  if (r === "/identity") return "대기 중인 본인 확인만 통과·거절합니다.";
  if (r === "/content/notices") return "공지를 초안으로 저장하고 게시·게시종료합니다.";
  if (r === "/content/events") return "이벤트를 초안으로 저장하고 게시·게시종료합니다.";
  if (r === "/content/benefits") return "혜택을 초안으로 저장하고 게시·게시종료합니다.";
  if (r === "/content/banners") return "배너를 초안으로 저장하고 게시·게시종료합니다.";
  if (r === "/content/messages") return "알림 글을 초안으로 저장하고 게시·게시종료합니다.";
  if (r === "/safety/alerts") return "이상한 이용 알림이 아직 연결되지 않았어요.";
  if (r === "/safety/cases") return "검토 사건이 아직 연결되지 않았어요.";
  if (r === "/safety/lists") return "차단 목록이 아직 연결되지 않았어요.";
  if (r === "/safety/limits") return "이용 한도는 아직 연결되지 않았어요.";
  if (r === "/reports") return "기존 운영 현황 영역입니다.";
  if (r === "/staff") return "직원 목록이 아직 연결되지 않았어요.";
  if (r === "/staff/approvals") return "기존 승인 요청 영역입니다.";
  if (r === "/activity") return "작업 기록이 아직 연결되지 않았어요.";
  if (r === "/activity/access") return "열람 기록이 아직 연결되지 않았어요.";
  if (r === "/service") return "서비스 상태 영역입니다.";
  if (r === "/service/display-timing") return "회원 화면에 보이는 진행 시간만 바꿉니다. 돈과 횟수는 그대로입니다.";
  if (r === "/service/incidents") return "진행 중인 문제 목록이 아직 연결되지 않았어요.";
  if (r === "/service/maintenance") return "점검 일정이 아직 연결되지 않았어요.";
  if (r === "/service/controls") return "기존 기능 제어 영역입니다.";
  return "필요한 정보를 확인한 뒤에만 바꾸고, 서버가 확인한 결과만 완료로 봅니다.";
}

const KNOWN_EXACT = new Set([
  "/",
  "/mine/today",
  "/mine/mines",
  "/mine/rates",
  "/mine/positions",
  "/mine/settlements",
  "/mine/system",
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
  "/money/deposit-guide",
]);

const KNOWN_PREFIX = ["/users/", "/conversations/ai/", "/money/", "/content/", "/safety/"];

export function isKnownRoute(route: string): boolean {
  if (KNOWN_EXACT.has(route)) return true;
  return KNOWN_PREFIX.some((prefix) => route.startsWith(prefix) && route.length > prefix.length);
}

function brandModeLabel(origin: OriginDecision): string {
  if (origin.mode === "isolated-qa") return "격리 확인";
  if (origin.mode === "waiting") return "연결 대기";
  return "운영 연결";
}

function healthCaption(origin: OriginDecision, session: AdminSession): string {
  if (origin.mode === "isolated-qa") return "격리 확인 중";
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
