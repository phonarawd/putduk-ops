# 어드민 화면·버튼·API 전체 대조표

기준: PUTDUK_OPS 워킹트리 · 2026-09-15 · HEAD `7b78beb` + dirty.  
기존 `ADMIN_SCREEN_MAP.md`는 주소 요약만 있고, 본 표가 전수 목록이다.

상태 값: **실제 연결** / **mock 전용** / **연결 대기** / **깨짐** / **확인 불가**

공통 셸: `app/admin-app.tsx` — 미인증이면 `/login?next=`로 보냄(클라이언트만).  
어댑터: `lib/admin/adapter.ts` → isolated / live / waiting.

---

## A. 라우트·메뉴

| # | 주소 | 메뉴 | 화면 컴포넌트 | 동작 | API | 상태 |
|---|---|---|---|---|---|---|
| 1 | `/login` | 없음 | `login-screen.tsx` | 격리 계정만 입장. live는 제출 비활성 | 격리: in-memory. live: `GET /admin-session`만. 비밀번호 POST 안 함 | 실제 연결(세션 조회) / 비밀번호는 연결 대기 |
| 2 | `/` | 오늘 할 일 | `Dashboard` | 통계 “확인할 수 없음”. 예시 할 일 2개 | 없음 | 연결 대기 |
| 3 | `/users` | 회원 찾기 | `UsersSearch` | UUID 형식만 `/users/:id`로 이동. 목록 fetch 없음 | 백엔드 dirty `GET /admin/users` 있으나 화면 미호출 | 연결 대기 |
| 4 | `/users/:id` | (동적) 회원 기회·등급 | `MembershipWorkspace` + `DraftUserExtras` | 조회·한도·보너스·등급 | membership / daily-match-cap / bonus / reclaim | 실제 연결(기회·등급). extras는 연결 대기 |
| 5 | `/membership/grades` | 등급별 하루 기회 | `GradesScreen` | 표 + 저장 | GET/PUT `.../grade-daily-caps` | 실제 연결 |
| 6 | `/support` | 문의함 | `Support` | 초안 배너 | ops-messages는 회원 UUID 있을 때만 존재. 화면 미연결 | 연결 대기 |
| 7 | `/conversations/ai` | 퍼뜩 AI 대화 | `Conversations` | 검색·필터는 로컬 no-op | AI logs 컨트롤러는 있음. 화면 미연결 | 연결 대기 |
| 8 | `/conversations/ai/:id` | AI 대화 상세 | `Conversation` | 내용 없음 | 없음(화면) | 연결 대기 |
| 9 | `/money/deposits` | 입금 확인 | `Money` | 하위 주소 구분 없음 | KRW deposit admin 컨트롤러 있음. 미연결 | 연결 대기 |
| 10 | `/money/withdrawals` | 출금 요청 | `Money` | 동일 | withdraw-review 있음. 미연결 | 연결 대기 |
| 11 | `/money/transactions` | 전체 거래 | `Money` | 동일 | ledger journals 있음. 미연결 | 연결 대기 |
| 12 | `/money/mismatches` | 맞지 않는 금액 | `Money` | 동일 | recon 있음. 미연결 | 연결 대기 |
| 13 | `/identity` | 본인 확인 | `Identity` | 초안 | KYC queue 있음. 미연결 | 연결 대기 |
| 14 | `/content/notices` | 공지사항 | `Content` | 하위 구분 없음 | 공지 Admin 컨트롤러 이 조사에서 확인 안 됨 | 연결 대기 |
| 15 | `/content/events` | 이벤트 | `Content` | 동일 | 없음으로 단정하지 않음. 화면 미연결 | 연결 대기 |
| 16 | `/content/benefits` | 혜택 | `Content` | 동일 | 사용자 `GET /me/benefits`는 고객웹. Admin 혜택 API 미확인 | 연결 대기 |
| 17 | `/content/banners` | 배너 | `Content` | 동일 | 미확인 | 연결 대기 |
| 18 | `/content/messages` | 알림 보내기 | `Content` | 동일 | ops-messages와 다름. 미연결 | 연결 대기 |
| 19 | `/safety/alerts` | 이상한 이용 | `Safety` | 하위 구분 없음 | risk queue 있음. 미연결 | 연결 대기 |
| 20 | `/safety/cases` | 검토 사건 | `Safety` | 동일 | 미연결 | 연결 대기 |
| 21 | `/safety/lists` | 차단 목록 | `Safety` | 동일 | risk userFreeze 등 있음. 미연결 | 연결 대기 |
| 22 | `/safety/limits` | 이용 한도 | `Safety` | 동일 | match-policy와 혼동 가능. 미연결 | 연결 대기 |
| 23 | `/reports` | 운영 현황 | `Reports` | 가짜 성장률 없음 | ledger reports 있음. 미연결 | 연결 대기 |
| 24 | `/staff` | 직원 | `Staff` | 초안 | 직원 목록 HTTP 미확인 | 연결 대기 |
| 25 | `/staff/approvals` | 승인 요청 | `Staff` | 동일 | 미연결 | 연결 대기 |
| 26 | `/activity` | 작업 기록 | `History` | 초안 | `GET /admin/audit/events` 있음. 미연결 | 연결 대기 |
| 27 | `/activity/access` | 열람 기록 | `History` | 동일 | 별도 열람 API 미확인 | 연결 대기 |
| 28 | `/service` | 서비스 상태 | `Service` | 초안 + 진행시간 링크 | kill-switch 있음. 미연결 | 연결 대기 |
| 29 | `/service/display-timing` | 화면 진행 시간 | `PresentationScreen` | 7단계 atSec | GET/PUT presentation-profile | 실제 연결 |
| 30 | `/service/incidents` | 진행 중인 문제 | `Service` | `/service`와 동일 컴포넌트 | 미연결 | 연결 대기 |
| 31 | `/service/maintenance` | 점검 일정 | `Service` | 동일 | 미연결 | 연결 대기 |
| 32 | `/service/controls` | 기능 켜기·끄기 | `Service` | 동일 | kill-switch 미연결 | 연결 대기 |
| 33 | 그 외 catch-all | 없음 | 본문 없음 | 제목만 “오늘 할 일” | 없음 | **깨짐** |
| 34 | 상품 관리 | 메뉴 없음 | 없음 | — | dirty `POST .../operator-products` 등 항상 503 | 연결 대기(화면 없음) |

메뉴 활성 판정은 `route.startsWith(자식 href)`라 `/users/uuid`는 “회원과 상담”에 붙는다.

---

## B. 로그인·로그아웃·보호

| 항목 | 위치 | 동작 | API | 상태 |
|---|---|---|---|---|
| 세션 확인 | `AdminApp` useEffect | `adapter.session()` | live `GET /api/v1/admin-session` | 실제 연결 |
| 미인증 리다이렉트 | `admin-app.tsx` | `window.location.replace(/login?next=)` | 없음 | 실제 연결(클라). SSR 가드 없음 → 확인 불가(서버 보호) |
| 비밀번호 제출 | `login-screen.tsx` | live/waiting에서 버튼 disabled | 호출 없음. 백엔드 dirty `POST /admin-session/login`은 503 | 연결 대기 |
| 격리 로그인 | 같은 파일 | `isolatedLogin(username)` 비밀번호 무시 | mock | **mock 전용** |
| 격리 모드 켜기 | 루프백만 | `isolatedQa=1` + sessionStorage | 없음 | mock 전용. 운영 호스트는 `isLoopbackHost`로 차단 |
| 로그아웃 | 사이드 `LogOut` | `adapter.logout()` 후 `/login` | live `POST /admin-session/logout` + CSRF | 실제 연결 |
| CSRF | `client.ts` | 쓰기만 `x-admin-csrf`. 다른 origin 쓰기 거절 | 쿠키 `aipo_admin_csrf` | 실제 연결(코드). 실서버 왕복은 확인 불가 |
| 사용자 쿠키 | `contract.ts` | `aipo_session`을 관리자 인증으로 쓰지 않음 | — | 지킴 |
| ChatGPT 헬퍼 | `app/chatgpt-auth.ts` | AdminApp 미사용 | `/signin-with-chatgpt`는 vite 플러그인 | 미사용 코드 |

역할 메뉴 숨김은 없다. 쓰기는 서버/격리 스토어 403. 화면 숨김 ≠ 보호.

---

## C. 연결 화면의 버튼·폼·모달

### 회원 찾기 `/users`

| 컨트롤 | 동작 | API | 상태 |
|---|---|---|---|
| 회원 번호 입력 + Enter/버튼 | UUID면 `/users/:id`로 이동. 아니면 비활성 | 없음 | 연결 대기(목록). 형식 검사는 실제 연결 |
| 격리 칩 4개 | Next `Link`로 시험 UUID | mock 회원 | mock 전용. 클라이언트 라우팅이라 쓰기 중 이동 시 응답 혼입 가능 |

### 회원 상세 `/users/:id`

| 컨트롤 | 동작 | API | 상태 |
|---|---|---|---|
| 상태 카드 | cap/used/remaining/block | `GET .../membership` | 실제 연결. 응답 userId 미대조 |
| 한도 변경 | 확인창 → PUT cap | `PUT .../daily-match-cap` | 실제 연결. unready면 완료 안 함 |
| 0회 차단 | 확인창 → cap 0 | 동일 | 실제 연결 |
| 개인 지정 해제 | 확인창 → clear | 동일 | 실제 연결 |
| 추가 기회 지급 | 확인창 + 멱등키 | `PUT .../bonus-grants` | 실제 연결 |
| 새 요청 키 | `newIdempotencyKey()` | 없음 | **깨짐 가능**(불명확 후 키 재생성) |
| 미사용 회수 | 확인창 | `PUT .../reclaim` | 실제 연결. 회수 멱등키 없음 |
| 수동 등급 / 자동 복귀 | 확인창 | `PUT .../membership` | 실제 연결 |
| 확인 모달 | 대상/지금/변경/사유 | — | 실제 연결. backdrop 클릭 닫힘 |
| 개인정보 보기 | disabled | pii-reveal 컨트롤러 없음 | 연결 대기 |
| 이용 제한 | disabled | risk freeze 있음. 미연결 | 연결 대기 |

`quotaProjection`·`effective-preview`·`match-policy-override`는 포트/백엔드에 있으나 이 화면은 안 부른다.

### 등급 `/membership/grades`

| 컨트롤 | API | 상태 |
|---|---|---|
| 표 | `GET .../grade-daily-caps` | 실제 연결 |
| 저장 + expectedRevision | `PUT` 후 재목록 | 실제 연결. 409 처리 |

### 화면 진행 시간 `/service/display-timing`

| 컨트롤 | API | 상태 |
|---|---|---|
| 7단계 atSec + 전체 초 | GET/PUT presentation-profile | 실제 연결 |
| 미리보기 | 로컬 `previewPresentation` | 실제 연결(클라). 참여 생성 없음 |
| 기본 70초 편집창 | 로컬만. 저장 아님 | 실제 연결 |

### 오늘 할 일

| 컨트롤 | 동작 | 상태 |
|---|---|---|
| 할 일 2버튼 | onClick 없음. ID `W-24091`, `AI-8821` | **깨짐**(죽은 버튼) + 초안 예시 |

---

## D. 실서버 어댑터 · mock · fixture · 로컬 저장

| 이름 | 파일 | 언제 | 비고 |
|---|---|---|---|
| waiting | `adapter.ts` | API origin 없음 | 모든 쓰기 `CONNECTION_WAITING` |
| live | `live-adapter.ts` | `PUTDUK_ADMIN_API_ORIGIN` 있을 때 | 확인된 membership 경로만. 상품/목록/로그인 POST 없음 |
| isolated | `qa/isolated-store.ts` | 루프백 + 플래그 | 시험 회원 3+missing. sessionStorage 세션. 저장소 준비 토글 |
| fixture UUID | `QA_USERS` | 격리만 | `1111…`/`2222…`/`3333…`/`4444…` |
| 카나리 | `quality/isolation/canary.mjs` | 단위 시험 | 127.0.0.1:4178 |
| drizzle/D1 예제 | `db/`, `examples/d1/` | AdminApp 미사용 | 템플릿 잔존 |
| shadcn `components/ui` | 다수 | Admin 화면 미사용 | 불필요 의존 후보. 삭제 여부는 미실행 |

---

## E. 준비 중 · 미사용 · 중복

| 항목 | 위치 | 판정 |
|---|---|---|
| `Timeline` | `draft-screens.tsx` | 미사용 |
| `ADMIN_INTEGRATION_MAP.md` 함수명 | 문서 | 코드에 없음 |
| `chatgpt-auth.ts` | app | 미사용 |
| `sites-vite-plugin` `local_seedy` | build | 루프백 ChatGPT 흉내. Admin 로그인과 무관 |
| 상품 화면 | — | 없음. copy만 `catalogS2` |
| money/content/safety 하위 | 한 컴포넌트 | 주소만 다름. 중복 구현 아님 |
| 어댑터 3모드 | 의도 | 추가 상품 어댑터 없음 |
