# 백엔드 / 고객 웹 / 어드민 계약 차이표

읽은 시점: 2026-09-15T02:23:38+09:00 · 재확인 02:26:37 같은 해시.  
백엔드 git HEAD `31c8e7310032444e7bb3abe879d40cafc22b8bbe` + dirty(다른 경로). operator-control porcelain 비어 있음.  
매니페스트 `2026-09-15.mall-persist-v3` sha256 `71a5d90f34c937b553e801ba5b907eefb29e71129586c315de0b1fd3c17fd510`. 내장 head `ec436d4d32937f2778b4b764e89918de2ca70280`. persist `ebc9caed…` · visibility `89714a19…`. 해시 조작 없음.

## 계약 원문

| 항목 | 어드민 `lib/admin/contract.ts` | 백엔드 `quality/contracts/operator-control/manifest.json` | 고객 웹 |
|---|---|---|---|
| 묶음 버전 | `2026-09-14.b3.display-v19` (OPS 상수. 맞추지 않음) | `2026-09-15.mall-persist-v3` | 코드에 동일 매니페스트 없음 |
| HEAD | 읽은 백엔드 git `31c8e73` | 매니페스트 내장 `ec436d4` · 파일은 이번 읽기에서 clean | `db18783` (웹 레포) |
| implementation | `local_dirty_not_deployed` | 동일 키 | — |
| schemaApplied / storeReady | false / false | false / false | — |
| user-bundle fp | `16c9b462…7b52` | 동일 | membership 리더만 |
| display-vs-execution fp | `9bfa6f96…54a8` | 동일 | — |
| presentation fp | `24954d96…ee29` | 동일 | dirty `presentation-profile-draft.ts` 미연결 |
| features-130 fp | `4da385e3…5e89` | 동일 | — |
| 로그인 계약 | 문서 미구현 `POST /admin-auth/login` | `admin-session-login.v1.json` · path는 `/admin-session/login` · activation BLOCKED | 사용자 `POST /auth/login` |
| 회원 목록 계약 | 문서 미구현 `GET /admin/users` | `admin-member-directory.v1.json` · 페이지 목록 BLOCKED · UUID q만 | `GET /me/membership` 본인만 |
| 상품 가시성 | `/catalog` 폼 있음. persist 성공 열지 않음 | `product-visibility-concurrent-participate.v1.json` · 기본 all_public · S2 persist BLOCKED | 공용 `GET /opportunities` |
| 금액 권위 | 설정액≠실지급. `payoutAuthoritative`만 완료 | `money-authority.core.cjs` · 저널 없는 paid 무효 | 예상액을 정산처럼 넣을 수 있음 |
| 식별자 | 회원 대상만 userId 대조 + 세대 토큰 | 회원 DTO에 userId. 공용 상품·등급은 회원 주체 아님 | 세션 user |

`publishedToUiRepo=false`. 어드민·고객웹이 09-15 매니페스트를 공식 수신했다고 할 수 없다.

---

## HTTP · 요청 · 응답

| 기능 | 백엔드 실제 (dirty 포함) | 어드민 | 고객 웹 | 모순 |
|---|---|---|---|---|
| 비밀번호 로그인 | `POST /api/v1/admin-session/login` body `email`,`password`. 항상 503. JSON에 token 금지 | 호출 안 함. 문구는 admin-auth 미구현 | `POST /api/v1/auth/login` 사용자 | path·활성화·화면 문구 3중 불일치 |
| 세션 조회 | `GET /admin-session` `{connected,adminId,role}` | live 연결 | `GET /auth/session` | 쿠키 이름 다름. 혼용 없음 |
| 세션 교환 | `POST /admin-session` body token | 화면 없음 | 없음 | 어드민 UI 미사용 |
| 로그아웃 | `POST /admin-session/logout` CSRF | 연결 | `POST /auth/logout` | 분리됨 |
| 회원 목록 | `GET /admin/users?q=` 빈 q 503. uuid면 membership 재사용 | 로컬 UUID만. API 안 부름 | 없음 | 어드민 문서 “API 없음” ≠ 컨트롤러 존재 |
| 회원 상세 | `GET /admin/users/:id` **없음**. `.../membership` 있음 | membership GET | `GET /me/membership` | 사용자 DTO ≠ Admin DTO. 대체 금지 지킴 |
| PII | pii-reveal **없음** | 버튼 disabled | 프로필 PATCH | — |
| cap/bonus/grade/presentation | Nest 컨트롤러 있음. persist unready 503 | live 어댑터 연결 | 사용자 membership 읽기만 | 쓰기 권위는 Admin |
| 상품 등록 | `POST /admin/opportunities/operator-products` 항상 503 | `/catalog` 폼·미리보기. STORE_UNREADY면 성공 안 염 | 없음 | 화면 연결 ≠ persist |
| 공개 전환 | `PATCH .../visibility` 항상 503. 실컬럼 enum 없음 | 폼에 공개 범위 있음. 저장 성공 아님 | 서버 목록을 그대로 그림 | 화면 제한만으로 막으면 안 됨 |
| 참여 목록 | `GET .../participations` 503 | 어댑터만. 목록 UI 없음 | `GET /trades` 개인 | — |
| 기존 가격 | `PATCH .../pricing` 매수/매도/마진. **메모 필드 없음** | 없음 | `pricingVersion`·시세로 참여 거부 | 운영자 메모 ≠ 시스템 시세 검증 |
| 기존 hide/show | `user_opportunity_overrides` | 없음 | seats 파싱만 | override ≠ 상품 visibility |
| 리셀러 ID | HTTP DTO에 `resellerId`. 실DB 검증 false | 서버 값만 표시 | username/loginId/handle/resellerId 중 먼저 있는 값 표시 | 실DB 조회 확인 불가 |
| 지급 | mall `settlePayout`은 CJS만. Nest ledger adjust는 별면 | 금융 초안 | 참여 body에 `amountUsdt` | 프론트 금액 권위 금지 |
| 문의 | `GET/POST .../ops-messages` | 초안 | 미확인 | — |
| KYC | queue/approve/reject | 초안 | 사용자 submit | — |
| 출금 | review approve/reject + idempotencyKey | 초안 | 사용자 withdraw | — |
| 감사 | `GET /admin/audit/events` | 초안 | 없음 | — |
| AI | `GET /admin/ai-logs` preview≠transcript | 초안. 내용 안 염 | `POST /me/peotteok/chat` | — |
| 실행 정책 | `GET/PUT /admin/execution-policy` | 화면에서 편집 안 함 | — | 표시 Journey와 분리. 지킴 |
| 사용자 목록 대체 | `/me/membership` admin 목록 금지 | 쓰지 않음 | 본인 화면·여정 스냅샷 원본으로 사용 | 고객웹이 membership을 시간표로 가정할 수 있음 |

---

## 식별자 · 인증 · 금액

| 항목 | 백엔드 | 어드민 | 고객 웹 |
|---|---|---|---|
| 회원 | UUID | UUID만. 레거시 `PD-10284` 거부 | 세션 user |
| 리셀러 | referral_code 별칭 계약. HTTP 없음 | 없음 | 표시만 |
| 상품 | opportunities.id | 없음 | opportunityId |
| 참여 | participate_requests user+opp+idempotency | 없음 | idempotencyKey `idemp-시간` |
| Admin 쿠키 | `aipo_admin_session` HttpOnly | 동일 이름 | 안 씀 |
| Admin CSRF | `aipo_admin_csrf` + `x-admin-csrf` | 쓰기만 | 안 씀 |
| User 쿠키 | `aipo_session` | 관리자 인증 금지 | 사용 |
| JWT iss/aud | admin `ai-profit-os-admin`/`aipo-ops` · user `ai-profit-os-nest`/`peotteok-user` | 상수만 | user |
| 금액 단위 | 원장 USDT. 표시 KRW 가능 | 연결 화면은 “회”만 | 화면 KRW 우선, 전송 USDT |
| revision | grade/presentation expectedRevision | 화면이 보냄 | 상품 쪽 없음 |
| 멱등 | bonus idempotencyKey | 지급만. 회수는 없음 | 참여 키 |

---

## 확정 상품 컨셉 대조

기준: 전체 공개 기본, 동시 참여, 선택 공개=권한≠독점, 상품 공용·참여 개인, 가입 시 리셀러 ID, 지급=원장, 가격 근거=운영자 메모, 애니메이션/시간표 유지.

| 기준 | 어드민 | 백엔드 | 고객 웹 | 수정 위치(이번엔 안 함) |
|---|---|---|---|---|
| 운영자가 상품·금액 설정 | `/catalog` 화면 연결. persist 503 | mall CJS 필드 있음. persist 503. 기존 PATCH pricing은 시세 override | 설정 UI 없음 | BE persist |
| 전체 공개 기본 | 폼 기본 `all_public` | 계약 default all_public. 실컬럼 없음 | 받은 목록을 그림 | BE 스키마 |
| 동시 참여 | 독점 UI 없음. 문구 유지 | 소스에 `user_id` 필터 확인. 실 Postgres 동시성 BLOCKED | 개인 participate | BE 실DB 검증 |
| 선택 공개 ≠ 독점 | 없음 | 계약은 권한. override는 hide/show | 클라이언트 강제 없음 | BE visibility + 서버 404 |
| 상품 공용 / 결과 개인 | 없음 | 계약 분리. 구현 일부 | 목록 공용, trade 개인. 상세를 feed에 merge | WEB feed merge 재확인 |
| 리셀러 ID | 서버 값만 표시 | HTTP 배선 · 실DB 검증 false | username 표시 | BE 실DB 검증 · WEB 필드 |
| 지급=원장 | 설정액≠실지급. 저널 없으면 완료 금지 | `moneyAuthority` 코어. mall settle Admin HTTP 없음 | 예상액을 결과처럼 넣을 수 있음 | BE ledger · WEB ExecutionModal |
| 가격=메모 | `priceConfirmationMemo` 전송. 시스템 검증 아님 | 코어 필드 · 실컬럼 없음 · STORE_UNREADY | pricingVersion/시세를 게이트 | BE 스키마 apply · WEB 카피 |
| 시간표 유지 | presentation 7단계만 | 동일 계약 | dirty가 membership을 여정으로 가정할 수 있음 | WEB journey 바인딩 |

가짜 완료: 연결 화면은 `applied` 없으면 완료 토스트를 안 띄운다. 오늘 할 일·Money 통계는 꾸미지 않음.  
임시 ID: 격리 grantId `bmg_qa_*`. 고객웹 `idemp-`, `talk-`, `journal-index`.  
한 회원 독점 배정 UI는 어드민에 **없다**. 남은 것은 문서 문구·백엔드 슬롯·override 의미·고객웹 초안 `assignmentMode`.
