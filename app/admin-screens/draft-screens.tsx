"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { navHref } from "../../lib/admin-routes";
import { COPY } from "../../lib/admin/copy";
import { DraftBanner } from "./shared";

function NoLiveData({ children }: { children: React.ReactNode }) {
  return (
    <section className="panel" data-testid="no-live-data">
      <div className="panelhead">
        <div>
          <h2>데이터 없음</h2>
          <p>{children}</p>
        </div>
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
        <p className="ops-hint">데이터 없음. 실제 대화를 불러오지 않았어요.</p>
      </section>
    </>
  );
}

export function Conversation() {
  return <NoLiveData>대화 상세는 권한 있는 조회 계약이 확인되기 전에는 열지 않아요. 미리보기 문장을 전체 대화처럼 보여 주지 않습니다.</NoLiveData>;
}

export function Money() {
  return (
    <>
      <DraftBanner>{COPY.financeDryRun}</DraftBanner>
      <NoLiveData>입출금·거래 대기함 API가 없어 숫자 카드를 만들지 않았어요.</NoLiveData>
    </>
  );
}

export function Identity() {
  return <NoLiveData>본인 확인 대기함은 관리자 KYC 목록 계약이 있으나, 이 화면은 아직 연결하지 않았어요.</NoLiveData>;
}

export function Content({ route }: { route: string }) {
  return (
    <NoLiveData>
      공지·이벤트·배너·알림 쓰기 API를 확인한 뒤에만 연결합니다. 지금은 게시 완료로 표시하지 않아요. {route}
    </NoLiveData>
  );
}

export function Safety() {
  return <NoLiveData>자동 알림은 결론이 아닙니다. 위험 큐 연결 전에는 예시 사건을 실제처럼 보여 주지 않아요.</NoLiveData>;
}

export function Reports() {
  return <NoLiveData>운영 현황 숫자는 확인할 수 없어요. 가짜 성장률을 넣지 않았어요.</NoLiveData>;
}

export function Support() {
  return (
    <NoLiveData>
      회원별 운영 쪽지 API는 있으나 상담 대기함 전체 목록은 확인되지 않았어요. 특정 회원 번호로만 이어집니다.
    </NoLiveData>
  );
}

export function Staff({ approval }: { approval: boolean }) {
  return (
    <NoLiveData>{approval ? "승인 요청 대기함 미연결" : "직원 목록 API 미확인"}. 메뉴 숨김만으로 보호했다고 하지 않아요.</NoLiveData>
  );
}

export function History({ access }: { access: boolean }) {
  return <NoLiveData>{access ? "열람 기록" : "작업 기록"} 연결 대기. 초안 문장으로 채우지 않아요.</NoLiveData>;
}

export function Service() {
  return (
    <>
      <NoLiveData>모든 서비스 정상처럼 보이지 않아요. 상태 API를 받기 전에는 확인할 수 없음입니다.</NoLiveData>
      <div className="ops-form">
        <Link className="textbtn" href={navHref("/service/display-timing")}>
          화면 진행 시간 설정으로 이동
        </Link>
      </div>
    </>
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
