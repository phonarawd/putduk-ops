"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  Check,
  LockKeyhole,
} from "lucide-react";
import { COPY } from "../../lib/admin/copy";
import { Badge, DraftBanner, Stat } from "./shared";

export function Dashboard() {
  return (
    <>
      <DraftBanner>{COPY.draftBanner} 오늘 할 일 숫자는 실제 대기함이 아닙니다.</DraftBanner>
      <div className="stats">
        <Stat label="내가 맡은 일" value="확인할 수 없음" detail="대기함 API 미연결" tone="amber" />
        <Stat label="담당자 없는 일" value="확인할 수 없음" detail="추측하지 않아요" tone="amber" />
        <Stat label="오늘 마감" value="확인할 수 없음" detail="실제 건수를 받지 못했어요" tone="amber" />
        <Stat label="처리 완료" value="확인할 수 없음" detail="완료로 꾸미지 않아요" tone="amber" />
      </div>
      <section className="panel">
        <div className="panelhead">
          <div>
            <h2>먼저 확인할 일</h2>
            <p>실제 대기함이 붙기 전에는 완료하거나 이동할 항목이 없습니다.</p>
          </div>
        </div>
        <div className="tasklist" data-testid="dashboard-draft-tasks">
          <div className="task-inert" aria-disabled="true">
            <span className="taskicon amber">
              <AlertTriangle />
            </span>
            <span className="taskcopy">
              <span>
                <Badge tone="gray">초안</Badge>
              </span>
              <b>출금 확인 대기함은 아직 연결되지 않았어요.</b>
              <small>가짜 업무 번호로 완료처럼 보이지 않습니다.</small>
            </span>
            <span className="tasktime">
              <small>이동 불가</small>
            </span>
          </div>
          <div className="task-inert" aria-disabled="true">
            <span className="taskicon amber">
              <Bot />
            </span>
            <span className="taskcopy">
              <span>
                <Badge tone="gray">초안</Badge>
              </span>
              <b>퍼뜩 AI 대기함은 아직 연결되지 않았어요.</b>
              <small>초안이며 클릭해도 처리되지 않습니다.</small>
            </span>
            <span className="tasktime">
              <small>이동 불가</small>
            </span>
          </div>
        </div>
      </section>
    </>
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
  const rows: unknown[] = [];
  void q;
  void filter;
  return (
    <>
      <DraftBanner>회원에게 실제 보인 퍼뜩AI 대화 조회 API는 권한 경계를 확인한 뒤 연결합니다. AI 미리보기를 전체 대화처럼 보여 주지 않아요.</DraftBanner>
      <section className="panel">
        <div className="tools">
          <label className="search">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="회원 번호로만 찾습니다" />
          </label>
          <div className="pills">
            {["전체", "확인 필요"].map((x) => (
              <button className={filter === x ? "on" : ""} key={x} type="button" onClick={() => setFilter(x)}>
                {x}
              </button>
            ))}
          </div>
        </div>
        <p className="ops-hint">{rows.length === 0 ? "실제 대화를 불러오지 않았어요." : null}</p>
      </section>
    </>
  );
}

export function Conversation() {
  return (
    <section className="panel">
      <DraftBanner>대화 상세는 권한 있는 조회 계약이 확인되기 전에는 열지 않아요.</DraftBanner>
      <p className="ops-hint">미리보기 문장을 전체 대화처럼 보여 주지 않습니다.</p>
    </section>
  );
}

export function Money() {
  return (
    <>
      <DraftBanner>{COPY.financeDryRun}</DraftBanner>
      <div className="stats">
        <Stat label="확인 기다림" value="확인할 수 없음" detail="출금 대기함 미연결" tone="amber" />
        <Stat label="오늘 요청 금액" value="확인할 수 없음" detail="프론트에서 합산하지 않아요" />
        <Stat label="평균 처리 시간" value="확인할 수 없음" detail="초안 통계 아님" />
        <Stat label="오래 멈춘 요청" value="확인할 수 없음" detail="실제 건수 없음" />
      </div>
    </>
  );
}

export function Identity() {
  return (
    <section className="panel">
      <DraftBanner>본인 확인 대기함은 관리자 KYC 목록 계약이 있으나, 이 화면은 아직 연결하지 않았어요.</DraftBanner>
    </section>
  );
}

export function Content({ route }: { route: string }) {
  return (
    <section className="panel">
      <DraftBanner>공지·이벤트·배너·알림 쓰기 API를 확인한 뒤에만 연결합니다. 지금은 게시 완료로 표시하지 않아요.</DraftBanner>
      <p className="ops-hint">{route}</p>
    </section>
  );
}

export function Safety() {
  return (
    <section className="panel">
      <DraftBanner>자동 알림은 결론이 아닙니다. 위험 큐 연결 전에는 예시 사건을 실제처럼 보여 주지 않아요.</DraftBanner>
    </section>
  );
}

export function Reports() {
  return (
    <section className="panel">
      <DraftBanner>운영 현황 숫자는 확인할 수 없어요. 가짜 성장률을 넣지 않았어요.</DraftBanner>
    </section>
  );
}

export function Support() {
  return (
    <section className="panel">
      <DraftBanner>회원별 운영 쪽지 API는 있으나 상담 대기함 전체 목록은 확인되지 않았어요. 특정 회원 번호로만 이어집니다.</DraftBanner>
      <p className="ops-hint">회원 상세에서 정확한 번호를 연 뒤 쪽지를 다루는 흐름으로 이어갈 예정입니다.</p>
    </section>
  );
}

export function Staff({ approval }: { approval: boolean }) {
  return (
    <section className="panel">
      <DraftBanner>직원 권한은 서버 역할표가 최종입니다. 메뉴 숨김만으로 보호했다고 하지 않아요.</DraftBanner>
      <p className="ops-hint">{approval ? "승인 요청 대기함 미연결" : "직원 목록 API 미확인"}</p>
    </section>
  );
}

export function History({ access }: { access: boolean }) {
  return (
    <section className="panel">
      <DraftBanner>감사·열람 기록은 서버 목록이 붙기 전에 초안 문장을 남기지 않아요.</DraftBanner>
      <p className="ops-hint">{access ? "열람 기록" : "작업 기록"} 연결 대기</p>
    </section>
  );
}

export function Service() {
  return (
    <section className="panel">
      <DraftBanner>모든 서비스 정상처럼 보이지 않아요. 상태 API를 받기 전에는 확인할 수 없음입니다.</DraftBanner>
      <div className="ops-form">
        <Link className="textbtn" href="/service/display-timing">
          화면 진행 시간 설정으로 이동
        </Link>
      </div>
    </section>
  );
}

export function DraftUserExtras() {
  return (
    <section className="panel">
      <DraftBanner>
        가입·거래·문의·제한·강제 로그아웃은 각 계약이 확인되기 전에 실행하지 않아요. 직원 메모는 회원에게 보이면 안 됩니다.
      </DraftBanner>
      <div className="profile-actions">
        <button type="button" disabled>
          <LockKeyhole /> 개인정보 보기 · 미연결
        </button>
        <button type="button" disabled>
          이용 제한 · 미연결
        </button>
      </div>
    </section>
  );
}

export function Timeline() {
  return (
    <div className="timeline">
      <div>
        <span>
          <Check />
        </span>
        <div>
          <b>실제 관리 기록을 아직 불러오지 않았어요.</b>
          <small>초안 문장으로 채우지 않아요.</small>
        </div>
      </div>
    </div>
  );
}

