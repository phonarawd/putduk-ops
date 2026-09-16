"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { navHref } from "../../lib/admin-routes";
import { COPY } from "../../lib/admin/copy";
import { DraftBanner } from "./shared";

function EmptyPanel({
  title,
  children,
  next,
}: {
  title: string;
  children: React.ReactNode;
  next?: React.ReactNode;
}) {
  return (
    <section className="panel" data-testid="no-live-data">
      <div className="panelhead">
        <div>
          <h2>{title}</h2>
          <p>가짜 목록을 만들어 두지 않았어요.</p>
        </div>
      </div>
      <div className="empty-box">
        <b>지금은 여기서 처리할 일이 없어요</b>
        <p>{children}</p>
        {next}
      </div>
    </section>
  );
}

export function Conversations({
  q,
  setQ,
  filter,
  setFilter,
}: {
  q: string;
  setQ: (s: string) => void;
  filter: string;
  setFilter: (s: string) => void;
}) {
  void q;
  void setQ;
  void filter;
  void setFilter;
  return (
    <>
      <DraftBanner>회원에게 실제로 보인 퍼뜩 대화는 아직 이 화면에 연결되지 않았어요.</DraftBanner>
      <EmptyPanel title="퍼뜩 AI 대화" next={<p>다음에 할 일: 회원 찾기에서 회원 번호를 연 뒤 그 회원의 상담을 확인하세요.</p>}>
        대화 목록을 아직 불러오지 않아요. 미리보기 문장을 실제 대화처럼 보여 주지 않습니다.
      </EmptyPanel>
    </>
  );
}

export function Conversation() {
  return (
    <EmptyPanel title="대화 상세">
      이 대화를 볼 권한이 확인되기 전에는 내용을 열지 않아요. 미리보기 문장을 전체 대화처럼 보여 주지 않습니다.
    </EmptyPanel>
  );
}

const MONEY_COPY: Record<string, { title: string; body: string }> = {
  "/money/deposits": {
    title: "입금 확인",
    body: "입금 확인 목록이 아직 이 화면에 연결되지 않았어요. 확인했다고 표시할 숫자 카드를 만들지 않았습니다.",
  },
  "/money/withdrawals": {
    title: "출금 요청",
    body: "출금 요청 대기함이 아직 이 화면에 연결되지 않았어요. 승인할 가짜 요청을 만들지 않았습니다.",
  },
  "/money/transactions": {
    title: "전체 거래",
    body: "거래 내역 조회가 아직 이 화면에 연결되지 않았어요. 예시 거래를 채워 두지 않았습니다.",
  },
  "/money/mismatches": {
    title: "맞지 않는 금액",
    body: "금액 불일치 목록이 아직 이 화면에 연결되지 않았어요. 추측 차이를 보여 주지 않습니다.",
  },
};

export function Money({ route }: { route: string }) {
  const row = MONEY_COPY[route] ?? {
    title: "돈과 거래",
    body: "입출금·거래 화면이 아직 연결되지 않았어요.",
  };
  return (
    <>
      <DraftBanner>{COPY.financeDryRun}</DraftBanner>
      <EmptyPanel title={row.title}>{row.body}</EmptyPanel>
    </>
  );
}

export function Identity() {
  return (
    <EmptyPanel title="본인 확인" next={<p>다음에 할 일: 연결되면 여기서 제출된 확인을 통과·보류할 수 있어요.</p>}>
      본인 확인 대기함이 아직 이 화면에 연결되지 않았어요. 가짜 대기열을 만들지 않았습니다.
    </EmptyPanel>
  );
}

const CONTENT_COPY: Record<string, { title: string; body: string }> = {
  "/content/notices": {
    title: "공지사항",
    body: "공지를 올리거나 고치는 기능이 아직 이 화면에 연결되지 않았어요.",
  },
  "/content/events": {
    title: "이벤트",
    body: "이벤트 등록이 아직 이 화면에 연결되지 않았어요. 게시 완료처럼 보이지 않습니다.",
  },
  "/content/benefits": {
    title: "혜택",
    body: "혜택 관리가 아직 이 화면에 연결되지 않았어요.",
  },
  "/content/banners": {
    title: "배너",
    body: "배너를 올리거나 숨기는 기능이 아직 이 화면에 연결되지 않았어요.",
  },
  "/content/messages": {
    title: "알림 보내기",
    body: "회원 알림 보내기가 아직 이 화면에 연결되지 않았어요. 보낸 것처럼 표시하지 않습니다.",
  },
};

export function Content({ route }: { route: string }) {
  const row = CONTENT_COPY[route] ?? {
    title: "공지와 이벤트",
    body: "공지·이벤트·배너·알림이 아직 이 화면에 연결되지 않았어요.",
  };
  return <EmptyPanel title={row.title}>{row.body}</EmptyPanel>;
}

const SAFETY_COPY: Record<string, { title: string; body: string }> = {
  "/safety/alerts": {
    title: "이상한 이용",
    body: "자동 알림은 결론이 아닙니다. 위험 목록이 연결되기 전에는 예시 사건을 보여 주지 않아요.",
  },
  "/safety/cases": {
    title: "검토 사건",
    body: "검토 사건 대기함이 아직 이 화면에 연결되지 않았어요.",
  },
  "/safety/lists": {
    title: "차단 목록",
    body: "차단 목록이 아직 이 화면에 연결되지 않았어요. 예시 회원을 넣지 않았습니다.",
  },
  "/safety/limits": {
    title: "이용 한도",
    body: "이용 한도 설정이 아직 이 화면에 연결되지 않았어요. 회원 찾기에서 하루 기회는 따로 바꿀 수 있어요.",
  },
};

export function Safety({ route }: { route: string }) {
  const row = SAFETY_COPY[route] ?? {
    title: "안전 관리",
    body: "안전 관리 목록이 아직 이 화면에 연결되지 않았어요.",
  };
  return <EmptyPanel title={row.title}>{row.body}</EmptyPanel>;
}

export function Reports() {
  return (
    <EmptyPanel title="운영 현황">
      운영 숫자를 확인할 수 없어요. 가짜 성장률이나 예시 차트를 넣지 않았어요.
    </EmptyPanel>
  );
}

export function Support() {
  return (
    <EmptyPanel
      title="문의함"
      next={
        <Link className="textbtn" href={navHref("/users")}>
          회원 찾기로 이동
        </Link>
      }
    >
      상담 대기함 전체 목록은 아직 없어요. 특정 회원 번호를 찾은 뒤에만 이어서 볼 수 있어요.
    </EmptyPanel>
  );
}

export function Staff({ approval }: { approval: boolean }) {
  return (
    <EmptyPanel title={approval ? "승인 요청" : "직원"}>
      {approval
        ? "승인 요청 대기함이 아직 이 화면에 연결되지 않았어요."
        : "직원 목록이 아직 이 화면에 연결되지 않았어요. 메뉴를 숨긴 것만으로 권한이 막히지는 않아요."}
    </EmptyPanel>
  );
}

export function History({ access }: { access: boolean }) {
  return (
    <EmptyPanel title={access ? "열람 기록" : "작업 기록"}>
      {access ? "누가 무엇을 열었는지" : "누가 무엇을 바꿨는지"} 기록이 아직 이 화면에 연결되지 않았어요.
    </EmptyPanel>
  );
}

const SERVICE_COPY: Record<string, { title: string; body: string }> = {
  "/service": {
    title: "서비스 상태",
    body: "지금은 모든 서비스가 정상인지 확인할 수 없어요. 정상처럼 꾸미지 않았어요.",
  },
  "/service/incidents": {
    title: "진행 중인 문제",
    body: "장애·문제 목록이 아직 이 화면에 연결되지 않았어요.",
  },
  "/service/maintenance": {
    title: "점검 일정",
    body: "점검 일정이 아직 이 화면에 연결되지 않았어요.",
  },
  "/service/controls": {
    title: "기능 켜기·끄기",
    body: "기능 스위치가 아직 이 화면에 연결되지 않았어요. 화면 진행 시간은 아래 링크로 갈 수 있어요.",
  },
};

export function Service({ route }: { route: string }) {
  const row = SERVICE_COPY[route] ?? {
    title: "서비스 설정",
    body: "서비스 설정이 아직 이 화면에 연결되지 않았어요.",
  };
  return (
    <>
      <EmptyPanel
        title={row.title}
        next={
          <Link className="textbtn" href={navHref("/service/display-timing")}>
            화면 진행 시간 설정으로 이동
          </Link>
        }
      >
        {row.body}
      </EmptyPanel>
    </>
  );
}

export function DraftUserExtras() {
  return (
    <section className="panel">
      <DraftBanner>
        가입·거래·문의·제한·강제 로그아웃은 각 기능이 연결되기 전에 실행하지 않아요. 직원 메모는 회원에게 보이면 안
        됩니다.
      </DraftBanner>
      <div className="profile-actions">
        <button type="button" disabled>
          <LockKeyhole /> 개인정보 보기 · 아직 연결 안 됨
        </button>
        <button type="button" disabled>
          이용 제한 · 아직 연결 안 됨
        </button>
      </div>
    </section>
  );
}
