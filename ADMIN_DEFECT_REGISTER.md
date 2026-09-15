# 어드민 전수조사 결함 목록

기준: 2026-09-15 PUTDUK_OPS 워킹트리.  
확인된 결함 / 같은 원인 묶음 / 추측·미실행·BLOCKED 를 분리한다.

## 2026-09-15 최소 통합 패치 (화면·어댑터만)

화면 수정 ≠ 운영 준비. 실서버 persist·직원 자격 저장소·회원 목록은 여전히 BLOCKED.

| ID | 이번 수정 | 재검증 (mock) |
|---|---|---|
| OPS-D01 | `login-screen.tsx` · `copy.ts` · `contract.ts` · `live-adapter.ts` login POST `/admin-session/login`. 503=준비 중. 성공 mock 없음 | Playwright live-unready + isolated 로그인. 실서버 로그인 BLOCKED |
| OPS-D20 | `membership-screen.tsx` UUID만 `GET /admin/users?q=`. 빈 q 호출 안 함. `/me/membership` 대체 없음 | isolated-admin + Playwright 404/정확 UUID |
| OPS-D02 | `admin-app.tsx` `notify(msg, ok)` · 실패 토스트 `toast-fail` | Playwright 저장 실패 `data-ok=false` |
| OPS-D09 | 알 수 없는 주소 → 제목 “없는 화면” | Playwright `/no-such-page` |
| OPS-D10 | 오늘 할 일 가짜 ID/완료 버튼 제거 | Playwright 초안만, `W-24091` 없음 |
| OPS-D14 | `copy.ts` 배정 문구 제거. `/catalog` 상품 화면 추가. persist 503 | Playwright 상품 미리보기·저장 실패 |
| OPS-D11 | 헤더: 격리 / 대기 / live+연결 / live+미확인 | Playwright 격리 헤더 |
| OPS-D03 / OPS-D27 | `live-adapter` 응답 userId 대조. 워크스페이스 세대 토큰 + `key={userId}` | Playwright 회원 전환 레이스. 계약에 userId가 없는 DTO는 세대 토큰만 |
| OPS-D05 | 격리 unready `bonusRemaining` 생략(확인 불가). live는 응답 값 그대로 | isolated-admin unready unknown |
| OPS-D12 | 읽은 매니페스트 `2026-09-15.mall-local-v2+persist` · sha256 기록. 버전 문자열만 맞춰 쓰지 않음 | 상수 대조 |

## 2026-09-15 계약 연결 마무리 (읽은 값만 · 커밋 아님)

읽은 시각: 2026-09-15T02:23:38+09:00 · 재확인 02:26:37 같은 해시.  
백엔드 git HEAD `31c8e7310032444e7bb3abe879d40cafc22b8bbe` + dirty(다른 경로). operator-control porcelain 비어 있음.  
매니페스트 `2026-09-15.mall-persist-v3` sha256 `71a5d90f…` · 내장 head `ec436d4` · persist `ebc9caed…` · visibility `89714a19…`. 해시·버전 문자열을 맞추지 않음.

| ID | 이번 정정 | 재검증 (mock) |
|---|---|---|
| OPS-D12 | git HEAD `31c8e73`와 매니페스트 내장 `ec436d4`를 둘 다 기록 | 상수 대조. fingerprint 조작 없음 |
| OPS-D14 | `/catalog`에 수정·공개·참여 조회 연결. 목록/단건 GET 없음. 409·미발급·금액 구분 | isolated-admin 23 + Playwright 20 |
| OPS-D04 | 불명확 후 같은 멱등키 재시도(추가 기회). 상품 등록 멱등키는 서버에 없음 | isolated replay |
| BE-D06/D07 | 메모 persist 필드 전송. 리셀러는 서버 값 또는 미발급 | Playwright mock. 실컬럼/실DB BLOCKED |
| BLK-01 | 320×568에서 확인 버튼·토스트·오류 배너 | Playwright mock. 실기기·키보드는 BLOCKED |
| BLK-05 | 격리 Playwright 보강. 실서버 쿠키 Playwright는 없음 | mock PASS ≠ 실서버 |

식별자: 회원 대상 응답만 요청 UUID 대조 + 세대 토큰. 공용 상품·등급 정책에 userId를 의무화하지 않음.

금액: `expectedProfitUsdt`=예상액, `configuredPayoutUsdt`=설정 지급액, `ledgerPaidUsdt`+`ledgerJournalId`만 실지급 근거. `payoutAuthoritative === true` 일 때만 지급 완료.

`priceConfirmationMemo` 는 코어 persist 필드. 실 Postgres 컬럼 없음 · Nest STORE_UNREADY.  
`resellerId` HTTP 배선됨 · 실DB 조회 검증 false. 없으면 미발급. 계정 이름 대체 없음.

## 2026-09-15 계약 재동기화 (이전 기록, 01:22:48)

읽은 시각: 2026-09-15T01:22:48+09:00 묶음 재확인.  
당시 백엔드 git HEAD `ec436d4d32937f2778b4b764e89918de2ca70280` + dirty. 매니페스트 sha256 `3e8b7c51…`. 지금은 HEAD·해시가 바뀌어 위 절로 대체.

식별자: 회원 대상 응답만 요청 UUID 대조 + 세대 토큰. 공용 상품·등급 정책에 userId를 의무화하지 않음. “모든 Admin 응답에 userId 의무화” 요청은 철회.

금액: `expectedProfitUsdt`=예상액, `configuredPayoutUsdt`=설정 지급액, `ledgerPaidUsdt`+`ledgerJournalId`만 실지급 근거. `payoutAuthoritative === true` 일 때만 지급 완료. 필드 누락·저널 없는 settled·클라이언트 계산은 완료 금지.

`priceConfirmationMemo` 는 코어 persist 필드. 실 Postgres 컬럼 없음 · Nest STORE_UNREADY. 시스템 검증 완료로 표시하지 않음.  
`resellerId` HTTP 배선됨 · 실DB 조회 검증 false. 서버가 준 값만 표시. 계정 이름 대체 없음.

| ID | 이번 정정 | 재검증 |
|---|---|---|
| BE-D04 | 소스 `user_id` 필터 확인. 실 Postgres 동시성은 BLOCKED 유지 | 소스 읽음 + `participate-http.cjs`. 실DB 미호출 |
| OPS-D12 | git HEAD `ec436d4` 기록. 매니페스트 내장 head·fingerprint는 읽은 값 | 해시 재계산 일치 |
| 금액 표시 | 상품 미리보기 설정액 ≠ 실지급 | isolated-admin + Playwright mock |

---

심각도: P0 출시 차단 · P1 잘못된 운영 판단 · P2 정직성/혼동 · P3 잔존·문서

---

## A. 확인된 결함

### OPS-D01 · P0 · 비밀번호 로그인 화면이 백엔드 dirty와 어긋남

- 근거: `app/admin-screens/login-screen.tsx` live 제출 disabled · `lib/admin/contract.ts` `DOCUMENTED_UNIMPLEMENTED.adminAuthLogin` · 백엔드 `admin-session.controller.ts` `@Post("login")`
- 재현: live 모드에서 아이디/비밀번호 입력. 버튼이 비활성. 네트워크에 login POST 없음.
- 기대: 확인된 경로만 호출. 없거나 503이면 완료가 아님.
- 실제: 화면은 `admin-auth/login` 미구현이라고 함. 백엔드는 `POST /admin-session/login`이 있고 항상 503.
- 영향: 운영자가 로그인할 수 없음. 잘못된 path로 구현하면 404.
- 원인: 확정. 계약 문서 지연 + 저장소 unready.
- 담당: 어드민(문구·path) + 백엔드(자격 저장소)
- 선행: 직원 자격 스토어 ACK
- 검증: unready 503 ≠ 완료. ready 후에만 쿠키.

연결: BE-D01

### BE-D01 · P0 · Admin 로그인 HTTP는 항상 STORE_UNREADY

- 근거: `admin-session.controller.ts` `createUnreadyStaffStore()` · `admin-session-login.v1.json` activation BLOCKED
- 재현: 제품 경로로 POST login (이번 조사는 운영 호출 안 함. 소스 확정)
- 기대: 저장소 준비 전 503 applied=false
- 실제: 성공 쿠키 경로가 제품에서 열리지 않음
- 영향: 출시 로그인 불가
- 원인: 확정
- 담당: 백엔드
- 선행: staff credential 스키마 + ACK
- 검증: isolation CJS ≠ 실DB PASS

### BE-D02 · P0 · 운영자 쓰기 저장소 unready

- 근거: manifest `schemaApplied=false` `storeReady=false` · membership 503 매핑
- 영향: cap/bonus/grade/presentation persist 없음
- 담당: 백엔드
- 선행: 스키마 apply 실측
- 검증: 쓰기 후 재조회. 메모리 값을 영속으로 쓰지 않음

### OPS-D14 · P0 · 상품 운영 화면 없음 + “배정” 문구

- 근거: 메뉴/라우트 0 · `lib/admin/copy.ts` `catalogS2` · `ADMIN_API_GAP_REPORT.md` “배정”
- 기대: 상품·구성·금액·공개범위·메모. 독점이 기본이 아님
- 실제: 화면 없음. 문구는 배정
- 담당: 어드민(화면은 persist 후) + 문서
- 연결: BE-D03, BE-D04, BE-D08

### BE-D03 · P0 · 쇼핑몰 상품 HTTP가 항상 503

- 근거: `operator-mall-product.admin.service.ts` `createUnreadyMallStore()` · routes POST/PATCH/GET
- 영향: 등록·공개·참여 목록 persist 0
- 담당: 백엔드
- 검증: 503 applied=false. ready 전 UI 완료 금지

### BE-D04 · P0 · 같은 상품 in-flight가 타인 참여를 막을 수 있음

기록은 반드시 분리한다. 로컬 소스 수정 ≠ 실DB PASS.

**a) 타인 참여 차단 소스 수정: 확인** (2026-09-15 git HEAD `ec436d4`)

- `services/api-nest/src/opportunities/participate.service.ts` `countActiveTradesForOpportunity(opportunityId, userId)`
- SQL: `AND user_id = $2::uuid` · running/requeue 만 집계
- 회귀 근거: `tooling/verify/participate-http.cjs` — `AND user_id = $2::uuid` 없으면 fail
- 01:22:48 재읽은 계약 JSON `userIdFilterApplied: true` · `changeNotApplied: false` · SQL에 `user_id`
- 소스와 계약 문구는 일치. 실 Postgres 동시성은 여전히 BLOCKED

**b) 실 Postgres 동시성 검증: BLOCKED**

- 계약 `realPostgresConcurrency: BLOCKED` · `testPlan.realPostgresMultiConnection` 은 URL 없으면 PASS 금지
- 이번 작업 실DB 미호출. 소스 확인만으로 PASS 승격 금지

- 담당: 백엔드 (실DB 검증) / 어드민은 독점 잠금 UI를 만들지 않음
- 선행: 격리 QA Postgres에서 A/B 동시 참여

### BE-D05 · P0 · 회원 페이지 목록 없음

- 근거: `searchUsers` 빈 q 503 · 디렉터리 계약 paginatedList BLOCKED
- 담당: 백엔드
- 연결: OPS-D20

### OPS-D20 · P1 · 화면이 `GET /admin/users`를 안 부름

- 근거: `UsersSearch`는 로컬 UUID만 `location.assign`
- 기대: 계약이 UUID lookup이면 그 API를 쓰거나, 없으면 “없음”을 맞출 것
- 실제: 문서는 없음, 백엔드는 있음(목록은 503)
- 담당: 어드민(계약 재확인 후)
- 선행: 백엔드 목록 의미가 확정된 뒤

### OPS-D02 · P1 · 실패도 성공 체크 토스트

- 근거: `admin-app.tsx` `notify(s)` 한 인자 · 토스트에 항상 `<Check />` · 화면은 `notify(msg, false)` 호출
- 재현: 격리에서 짧은 사유로 저장
- 기대: 실패는 완료 아이콘이 아님
- 실제: 문구는 실패, 아이콘은 체크
- 담당: 어드민
- 검증: 실패/성공 토스트 구분

### OPS-D03 · P1 · 응답 회원번호 미대조

- 근거: `live-adapter.ts` `snapshotFromBody` — quota.userId는 요청값, membership.userId는 응답값. 일치 검사 없음. `listBonus`는 캐스팅만
- 기대: 다른 userId면 표시하지 않음
- 실제: 늦은/잘못된 본문을 그릴 수 있음
- 담당: 어드민
- 검증: 응답 userId ≠ 요청이면 UNKNOWN

연결: OPS-D27

### OPS-D27 · P1 · 클라이언트 이동 중 늦은 쓰기 결과가 다른 회원 화면에 남을 수 있음

- 근거: 격리 칩이 `Link`(클라 라우팅). `runWrite`/`reload`가 userId 클로저. generation 토큰 없음
- 재현: 회원 A 저장 클릭 직후 B 칩 클릭 (격리)
- 기대: A 결과가 B 화면에 안 붙음
- 실제: 코드상 가능. 브라우저 미실행 → 동적 재현은 확인 불가에 가깝지만 원인 코드는 확정
- 담당: 어드민
- 검증: 이동 후 스냅샷 userId === 주소

### OPS-D04 · P1 · 불명확 후 멱등키 재생성

- 근거: “새 요청 키” 버튼 · `newIdempotencyKey()`
- 영향: 결과가 불명확할 때 새 키로 이중 지급 가능
- 담당: 어드민
- 검증: 불명확 시 같은 키 재조회. 새 키는 명시적 새 지급만

### OPS-D05 · P1 · 격리 unready에서 추가 잔여를 0으로 표시

- 근거: `isolated-store.ts` `bonusRemaining: schemaReady ? bonus.remaining : 0`
- 기대: 확인 불가
- 실제: 0회처럼 보임
- 담당: 어드민(mock 정직성)
- 검증: unready면 UnknownStat

### OPS-D06 · P2 · 격리 지급 ID가 임시값

- 근거: `grantId: bmg_qa_${n}`
- 담당: 어드민(시험 전용 표기 유지)
- 영향: 실 ID로 오해 가능

### OPS-D08 · P1 · 보호가 클라이언트만

- 근거: `app/page.tsx`·`[...path]/page.tsx` 세션 없음. JS 로드 후 리다이렉트
- 기대: 미인증 HTML도 가드되거나, API만 비밀이라는 전제가 문서화
- 실제: 셸 JS는 공개. 데이터는 쿠키 API
- 담당: 어드민
- 검증: 미인증에서 회원 숫자가 안 나옴(API). SSR 가드는 별도

### OPS-D09 · P2 · 알 수 없는 주소가 빈 “오늘 할 일”

- 근거: catch-all + title fallback + 본문 조건 없음
- 담당: 어드민
- 검증: `/no-such-page`에 “없는 화면” 

### OPS-D10 · P2 · 오늘 할 일 죽은 버튼 + 가짜 ID

- 근거: `draft-screens.tsx` `tasks` · button onClick 없음
- 담당: 어드민
- 검증: 클릭해도 이동/완료 없음. 예시 ID 제거 또는 초안 명시만

### OPS-D11 · P2 · live여도 “운영 연결 확인 필요”

- 근거: `admin-app.tsx` healthy 문구가 isolated가 아니면 항상 그 문장
- 담당: 어드민

### OPS-D12 · P1 · 어드민 계약 상수가 백엔드 dirty와 불일치

- 근거: `contract.ts` HEAD/버전/미구현 목록 vs manifest 2026-09-15
- 담당: 어드민
- 선행: 백엔드 계약 봉인 또는 dirty 재읽기

### OPS-D15 · P2 · ChatGPT 체험 인증 잔존

- 근거: `chatgpt-auth.ts` · `build/sites-vite-plugin.ts` `local_seedy`
- 영향: 루프백에서 다른 로그인으로 오해 가능. AdminApp은 미사용
- 담당: 어드민
- 검증: Admin 로그인과 연결되지 않음을 유지하거나 제거

### OPS-D16 · P3 · 문서/컴포넌트 중복·폐기

- 근거: `ADMIN_INTEGRATION_MAP.md` 가상 함수 · `ADMIN_SOURCE_STATUS.md` 프로토타입 · `Timeline` 미사용
- 담당: 어드민 문서

### OPS-D17 · P2 · 역할과 무관하게 모든 메뉴 노출

- 근거: `groups` 고정. `ROLE_CAPABILITY`는 안내만
- 기대: 숨김 ≠ 보호이지만, 쓸 수 없는 쓰기가 열려 있으면 혼란
- 실제: marketing도 회원 쓰기 UI 보임. 격리는 403
- 담당: 어드민
- 검증: 403 후 완료 없음

### OPS-D18 · P2 · 돈/콘텐츠/안전 하위 주소가 한 초안

- 근거: `route.startsWith("/money/")` 등
- 영향: 입금과 출금이 같은 화면. 잘못된 연결로 착각
- 담당: 어드민

### OPS-D21 · P1 · bonus 응답 검증 약함

- 근거: `listBonus` `rec as BonusList` · grant 캐스팅
- 담당: 어드민
- 연결: OPS-D03

### OPS-D22 · P3 · 확인창 backdrop 클릭 닫힘

- 근거: `ConfirmDialog` `onMouseDown={close}`
- 영향: 실수 취소. 저장 중이면 close가 busy에 막힘
- 담당: 어드민
- 동적 확인: BLOCKED

### OPS-D07 · P2 · 격리 로그인에 비밀번호 없음

- 근거: `isolated-store.login` username만
- 의도된 mock. 운영 호스트에서는 비활성
- 담당: 어드민(문구 유지)

### BE-D06 · P1 · 가격 확인 메모 실컬럼 미적용

- 근거: mall 코어 `priceConfirmationMemo` persist 코드 있음. `persist-status.v2` `livePostgresColumn: false` · Nest STORE_UNREADY. 기존 `patchPricing` reason 과 별도
- 기대: 가격 근거는 메모. 시스템 시세 검증이 아님
- 실제: 코어 필드·드래프트 SQL은 있음. 운영 스키마 미적용
- 담당: 백엔드
- 연결: WEB-D01

### BE-D07 · P1 · 리셀러 ID 라이브 Postgres 미검증

- 근거: Nest `searchUsers`/`getMembership`에 `resellerId` 배선. `persist-status.v2` `adminHttpExactLivePostgresVerified: false`. 컬럼 없으면 42703 → null
- 어드민: 응답에 값이 있을 때만 표시. username·추천 코드로 채우지 않음
- 담당: 백엔드
- 연결: WEB-D03

### BE-D08 · P1 · 실스키마에 상품 visibility enum 없음

- 근거: 계약 `noProductVisibilityEnum: true` · proposedFields
- 담당: 백엔드

### BE-D09 · P1 · user_opportunity_overrides ≠ 공개 범위

- 근거: hidden/force_show · 계약 L58–68
- 담당: 백엔드 + 어드민(혼동 UI 금지)

### BE-D10 · P2 · 없는 Admin HTTP

- `POST /admin-auth/login` · `GET /admin/users/:id` · pii-reveal · reseller 발급 · mall settle HTTP
- 담당: 백엔드. 어드민은 발명 금지

### WEB-D01 · P1 · 시세/pricingVersion을 참여 게이트로 사용

- 근거: `GptContext.tsx` · `participate.ts` · `messages.ts` PRICE_STALE
- 기대: 운영자 메모 근거. 시스템 가격 검증처럼 보이지 않음
- 실제: 조건 변경/오래됨으로 참여 거부
- 담당: 고객 웹 + 백엔드 의미 확정
- 선행: 시세 게이트가 상품 컨셉의 일부인지 Human 확인

### WEB-D02 · P1 · 예상 이익을 정산처럼 표시할 수 있음

- 근거: `expectedProfitKrw: snapshot.profitKrw` · ExecutionModal
- 담당: 고객 웹
- 검증: 서버 원장 금액만 정산

### WEB-D03 · P1 · 리셀러 ID가 username 계열 표시

- 근거: `sessionUsername` · `makeResellerId() === ""`
- 담당: 고객 웹 + 백엔드

### WEB-D04 · P2 · “확인된 비용/수수료” 카피

- 근거: `CostTable.tsx`
- 담당: 고객 웹

### WEB-D05 · P3 · seats 필드 파싱

- 근거: `feed-readers.ts` · UI 미표시
- 담당: 고객 웹
- 독점 좌석으로 쓰이는지는 미확인

### WEB-D06 · P2 · membership 응답을 여정 프로필로 가정

- 근거: `GptContext.tsx` `presentationIncomingRef`
- 담당: 고객 웹
- 시간표 변경 금지와 충돌할 수 있음

### WEB-D07 · P3 · “나만의 리셀” 카피

- 근거: `src/app/page.tsx`
- 담당: 고객 웹

### WEB-D08 · P2 · API origin 기본값 `https://api.hiptk.app`

- 근거: `src/lib/api.ts`
- 어드민은 환경 없으면 추측하지 않음. 고객웹은 기본 host가 있음
- 담당: 고객 웹
- 이번 조사에서 운영 호출 안 함

---

## B. 같은 원인으로 묶음

| 원인 | 영향 ID |
|---|---|
| 저장소/스키마 미적용 | BE-D01, BE-D02, BE-D03, BE-D05 |
| 계약 문서가 dirty보다 늦음 | OPS-D01, OPS-D12, OPS-D20 |
| 응답 주체 미검증 | OPS-D03, OPS-D21, OPS-D27 |
| 상품 컨셉(공개≠배정, 메모≠시세검증) 미반영 | OPS-D14(화면은 있음·persist BLOCKED), BE-D04(소스 확인·실DB BLOCKED), BE-D06, BE-D08, BE-D09, WEB-D01, WEB-D04, WEB-D07 |
| 초안 화면 한 컴포넌트 | OPS-D10, OPS-D18 |
| 식별자 임시/표시 혼동 | OPS-D06, WEB-D03, WEB-D08 |

---

## C. 추측 · 미실행 · BLOCKED (확인 결함과 분리)

| ID | 내용 | 이유 |
|---|---|---|
| BLK-01 | 모바일 잘림·키보드·모달·뒤로가기 | Playwright 390px에서 상품 입력·헤더 폭만 mock PASS. 실기기·키보드·뒤로가기는 여전히 확인 불가 |
| BLK-02 | 실서버 CSRF·세션 만료·쿠키 SameSite | 운영 API 미호출 |
| BLK-03 | 실회원 ID만 바꿔 지급 | 실DB 금지. 코드상 Admin API는 가드+UUID. 고객 참여 visibility는 컬럼 없으면 생략될 수 있음(백엔드 dirty 주석) |
| BLK-04 | 브라우저 이중 클릭 실측 | `busy`는 setState라 두 클릭이 새기면 이중 요청 가능. 단위 시험 없음 |
| BLK-05 | 어드민 Playwright 실서버 | 격리 mock 화면 검사는 추가됨. 실서버 쿠키/DB Playwright는 없음 |
| BLK-06 | 고객웹 e2e isolation PASS 재사용 | 실행 안 함. 다른 레포 |
| BLK-07 | 가입 시 고유 리셀러 mint | 서버 런타임 미실행 |
| BLK-08 | 백엔드 dirty 추가분(조사 중 98→104) | 종료 이후 파일은 미포함일 수 있음 |
| BLK-09 | 공지/배너 Admin HTTP 전수 | 컨트롤러 검색은 했으나 콘텐츠 전용 모듈 미확인. “전부 0” 선언 안 함 |

로그인 우회: 운영 호스트에서 isolatedQa 쿼리만으로는 mock이 안 켜진다(`isLoopbackHost`). 루프백+플래그는 시험 모드. 운영 우회로 보지 않음.  
mock이 운영 빌드 env `PUTDUK_OPS_ISOLATED_QA=1`과 루프백이 겹치면 mock이 켜진다. 배포 환경 점검은 **미실행**.
