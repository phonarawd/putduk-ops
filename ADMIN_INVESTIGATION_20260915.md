# 퍼뜩 어드민 전수조사 — 2026-09-15

조사 기준: PUTDUK_OPS **현재 워킹트리**(HEAD `7b78beb` + 기존 dirty).  
애플리케이션·패키지·API·프레임워크는 수정하지 않았다.  
이전 isolated-admin PASS를 현재 운영 PASS로 재사용하지 않는다.

관련 산출물:

- 화면·버튼·API 대조: `ADMIN_SURFACE_MATRIX.md`
- 계약 차이: `ADMIN_CONTRACT_DIFF.md`
- 결함 목록: `ADMIN_DEFECT_REGISTER.md`
- 작업 큐: `quality/operator-ops-work-queue.json`

---

## 인라인 핵심 요약

현재 어드민은 **회원 기회·등급·화면 진행 시간만 실서버 어댑터에 연결되어 있고**, 나머지는 초안이다.  
비밀번호 로그인은 어드민이 `미구현`으로 막고, 백엔드 dirty에는 `POST /api/v1/admin-session/login`이 있으나 **항상 503**이다.  
상품 화면은 어드민에 **없다**. 백엔드 쇼핑몰 셸은 **persist 0 · 503**이다.  
확정 컨셉(전체 공개 기본, 동시 참여, 독점 예약 아님, 가격은 운영자 메모)과 **문서 문구·기존 opportunity 슬롯·고객웹 시세 게이트**가 어긋난다.  
격리 단위 시험 12건은 이번 실행에서 PASS이나, **브라우저·실서버·실지급은 BLOCKED**다.

---

## 1. 현재 실제 상태

### 작업 상태 고정 (2026-09-15 00:19~00:40 KST)

| 레포 | 폴더 | remote | branch | HEAD | dirty |
|---|---|---|---|---|---|
| 어드민 | `C:\Users\PC\Desktop\PUTDUK_OPS` | `https://github.com/phonarawd/putduk-ops.git` | `main` | `7b78beb93033da8b6c312f437762fd6b440e6ecf` | 기존 미커밋 유지. staged 0. 이번 조사는 보고서만 추가 |
| 백엔드 | `C:\Users\PC\Desktop\AI_PROFIT_OS` | `https://github.com/phonarawd/AI-Profit-OS.git` | `feat/operator-registered-catalog-s1` | `efdd6b742285651d0a8060ec3ecbc31d35520a73` | 읽기 중 dirty. 00:21 약 98줄 → 종료 시 porcelain 104줄. 핵심 Admin 파일은 계속 dirty |
| 고객 웹 | `C:\Users\PC\Desktop\PUTDUK_WEB` | `https://github.com/phonarawd/putduk-web.git` | `main` | `db187835445c20312c6fa232e11a7bbd6fbcb659` | dirty 많음. 읽기만 |

- 기존 어드민 작업물(`app/admin-screens/`, `lib/admin/`, quality 문서)은 **그대로 보존**. reset/stash/clean/commit/push/merge/배포/훅 변경 없음.
- 공용 QA 잠금 `PUTDUK_HEAVY_QA_V1`: 시작·종료 모두 **잠금 파일 없음**.
- 로컬 3000/4173/5173 등 개발 서버 수신 **없음**.
- Playwright는 이 레포에 **없음**. 브라우저 화면 검사는 **BLOCKED**.
- 운영 API/DB·실회원·실지급·외부 발송 **호출 없음**.

백엔드 `main`은 여전히 `27b5b9f7`이다. 어드민 `lib/admin/contract.ts`가 가리키는 HEAD도 `27b5b9f7`이다.  
**실제 읽은 백엔드는 브랜치 HEAD `efdd6b74` + dirty**이다. 이전 감사(`ADMIN_INTEGRATION_AUDIT.md`)의 HEAD와 다르다.

### 조사 범위 수

| 대상 | 수 | 확인 방법 |
|---|---:|---|
| 메뉴 그룹 | 9 | `app/admin-app.tsx` `groups` |
| 메뉴에 적힌 주소 | 29 | 같은 파일 children + 단독 href |
| 동적 주소 | 2 | `/users/:id`, `/conversations/ai/:id` |
| 로그인 주소 | 1 | `/login` |
| 어댑터 메서드 | 16 | `lib/admin/types.ts` `AdminOpsPort` |
| 초안 화면 컴포넌트 | 12 | `draft-screens.tsx` |
| 연결 화면 | 4 | 로그인(부분)·회원 찾기(부분)·회원 상세·등급·진행 시간 |
| 백엔드 Admin 컨트롤러 파일 | 25+ | `services/api-nest/src/**/*admin*.ts` 읽기 |
| 신규/갱신 계약 JSON | 3+매니페스트 | `quality/contracts/operator-control/` |
| 고객웹 `api.ts` path | 31 | 문자열만 |
| 격리 시험 항목 | 12 | `isolated-admin-flow.test.mts` 재실행 |

검증하지 않은 영역(실서버 쿠키 로그인, 실DB persist, 실지급, 모바일 실기기, 브라우저 모달/키보드)은 **0건이라고 하지 않는다**.

### 연결 상태 한줄

| 영역 | 상태 |
|---|---|
| 운영자 세션 조회·로그아웃 | 실제 연결(경로). 비밀번호 로그인은 화면이 막고, 백엔드는 dirty 503 |
| 회원 UUID 상세 기회·등급·추가지급 | 실제 연결. 저장소 unready면 적용 실패 |
| 등급별 하루 기회 | 실제 연결 |
| 화면 진행 시간 | 실제 연결. 실행 정책과 분리 |
| 회원 페이지 목록 | 연결 대기. 백엔드 dirty `GET /admin/users`는 빈 q 503, UUID면 membership 재사용 |
| 상품 등록·공개·참여 목록 | 화면 없음. 백엔드 셸은 항상 503 |
| 문의·AI·입출금·공지·안전·직원·감사 | 초안. 일부 Nest API는 있으나 화면 미연결 |
| 격리 mock | 루프백 + 명시 플래그만. 운영 우회 아님 |

---

## 2. 출시를 막는 결함

출시 차단은 **확인된 것**만. 추측은 3절.

1. **운영자 비밀번호 로그인이 제품에서 열리지 않음** (`OPS-D01`, `BE-D01`)  
   화면은 live에서 제출을 막고 “서버에 아직 없습니다”라고 한다.  
   백엔드 dirty는 `POST /api/v1/admin-session/login`이 있으나 `createUnreadyStaffStore()`로 **항상 503**.  
   `POST /api/v1/admin-auth/login`은 여전히 컨트롤러 없음.

2. **쓰기 저장소가 준비되지 않음** (`BE-D02`)  
   매니페스트 `schemaApplied=false` · `storeReady=false`.  
   cap/bonus/grade/presentation persist는 unready면 503. 메모리 값을 영속으로 쓰면 안 된다.

3. **상품 운영 면이 출시 상태가 아님** (`OPS-D14`, `BE-D03`, `BE-D04`)  
   어드민에 상품 화면 없음.  
   Nest 쇼핑몰 셸은 항상 unready 503.  
   실테이블에 visibility enum 없음.  
   `countActiveTradesForOpportunity`가 user_id 없이 in-flight를 세어 **타인 동시 참여를 막을 수 있음**(변경 미적용).

4. **회원 디렉터리 목록이 없음** (`OPS-D20`, `BE-D05`)  
   페이지 목록 저장소 없음. 빈 q는 503. UUID 한 건 재사용만.  
   운영자가 회원을 찾아 지급·제한하는 출시 흐름이 성립하지 않는다.

5. **지급·원장 화면이 초안이고, 고객웹은 예상액을 정산처럼 보여 줄 수 있음** (`OPS-D18`, `WEB-D02`)  
   어드민 금융 쓰기는 열지 않음.  
   고객웹 dirty는 `expectedProfitKrw`를 실행 결과 칸에 넣을 수 있다. 실지급 권위가 아니다.

위 1~4가 해소되지 않으면 운영 출시 완료로 선언할 수 없다.

---

## 3. 확인된 오류·계약 모순·중복과 미확인 영역

### 확인된 오류·모순 (코드 근거)

- 어드민 계약 원문이 백엔드 dirty보다 한 세대 늦다. 버전 `2026-09-14.b3.display-v19` vs 매니페스트 `2026-09-15.visibility-concurrent-v1`. HEAD `27b5b9f7` vs `efdd6b74`.
- 로그인 path 불일치: 어드민 문서 `admin-auth/login` · 백엔드 실경로 `admin-session/login`.
- `GET /admin/users`를 어드민이 “없음”으로 취급. 백엔드 dirty에는 있으나 목록은 BLOCKED.
- 문구 `상품 등록·공개·배정`이 확정 컨셉(공개 권한 ≠ 독점 배정)과 모순.
- 실패 토스트도 체크 아이콘 (`notify`의 `ok` 무시).
- 회원 응답 `userId`를 요청 UUID와 대조하지 않음.
- 오늘 할 일 버튼이 가짜 ID를 들고 아무 데도 안 감.
- 알 수 없는 주소는 제목만 “오늘 할 일”이고 본문 없음.
- 헤더가 live 연결이어도 “운영 연결 확인 필요”.
- 격리 mock에서 저장소 unready인데 추가 잔여를 `0`으로 보여 줌.
- ChatGPT 체험 로그인 헬퍼·`local_seedy` 플러그인이 남아 있음. AdminApp은 쓰지 않음.
- 고객웹은 Admin API를 치지 않음(좋음). 다만 시세/`pricingVersion`을 참여 게이트로 쓰고, 리셀러 ID는 username 계열 표시.

### 중복

- 어댑터 3중(isolated / live / waiting)은 의도된 분기. 추가 상품 어댑터는 없음.
- 초안 화면이 하위 주소를 한 컴포넌트로 묶음(money/content/safety). 중복 API 호출은 없음.
- `ADMIN_INTEGRATION_MAP.md`의 `fetchAdminUsers` 등은 **코드에 없는 의도 이름**.
- `ADMIN_SOURCE_STATUS.md`는 프로토타입 시점 문서. 현재 구현과 불일치.
- `Timeline` 컴포넌트는 정의만 있고 화면에서 안 씀.
- `quotaProjection` / `effectivePreview` / `match-policy-override`는 백엔드에 있으나 화면·live 어댑터가 안 씀.

### 미확인 · BLOCKED (결함과 분리)

- 실서버 쿠키·CSRF·세션 만료·2FA 동작.
- 실DB persist 후 재조회.
- 실회원 IDOR·타인 지급.
- 모바일 실기기 잘림·키보드·뒤로가기.
- 브라우저 Playwright 화면 검사.
- 백엔드 dirty가 조사 중 더 늘어남(98→104). 종료 이후 추가 변경은 이 보고서 밖.
- 가입 시 서버가 **고유 리셀러 ID**를 실제로 mint하는지(고객웹은 username 표시만).

---

## 4. 실제 검사별 exit와 범위

실행: 2026-09-15, `scripts/with-heavy-qa-lock.mjs` 한 번으로 순차.  
임시 실행기 `quality/_qa-sequential.mjs`는 실행 후 **삭제**. 잠금은 종료 후 없음.

| 검사 | 명령 | exit | 범위 | 재사용 금지 이유 |
|---|---|---:|---|---|
| typecheck | `npm run typecheck` | **0** | 현재 워킹트리 TS | 이전 일자 PASS 재사용 안 함. 이번에 다시 돌림 |
| lint | `npm run lint` | **0** | eslint, quality/scripts 제외 | 동일 |
| 격리 단위 | `npm run test:isolated-admin` | **0** · PASS 12 | in-memory mock + 로컬 카나리 4178 | 실서버·브라우저 아님. 운영 host 차단은 allowlist 단위만 |
| build | `npm run build` (vinext) | **0** | 정적 분석 빌드. 라우트 `/`, `/:path+` | UI 동작 검증 아님 |
| Playwright 화면 | 없음 | **BLOCKED** | 이 레포에 playwright/config 없음 | WEB e2e isolation은 고객웹용. 어드민 화면에 쓰지 않음 |
| 운영 API | 호출 안 함 | **BLOCKED** | — | 지시 준수 |

격리 12항: 로그인, 명시 8회 보존, 없는 회원 404, 레거시 ID 비치환, STORE_UNREADY≠성공, 0회+보너스 유지, 멱등 재실행, cs 쓰기 거절, 409 revision, presentation 검증, me/membership 비사용, prod host 차단, 로컬 카나리.

---

## 5. 백엔드 / 어드민 / 고객 웹 수정 담당

| 담당 | 레포 | 이번 통합에서 맡길 일 |
|---|---|---|
| 백엔드 | `AI_PROFIT_OS` | 직원 자격 저장소 ACK 후 로그인 503 해제. 회원 목록 저장소. 상품 visibility 스키마·동시 참여 슬롯 재해석. 리셀러 ID mint 계약. 가격 메모 필드. 원장 지급. 기존 override≠공개범위 분리 |
| 어드민 | `PUTDUK_OPS` | 계약 HEAD/path 재동기화. 로그인 path를 `admin-session/login`에 맞추되 503을 완료로 바꾸지 않음. 회원 UUID 응답 대조. 토스트/죽은 버튼/빈 라우트. 상품 화면은 persist 준비 후에만. 배정 문구 제거 |
| 고객 웹 | `PUTDUK_WEB` | Admin API 노출 금지 유지. 시세 게이트를 운영자 가격 검증처럼 쓰지 않기. 예상액≠정산. 리셀러 ID는 서버 필드만. 여정 시간표 변경 금지 |

고객 웹에 Admin 기능을 심지 않는다.

---

## 6. 가장 작은 일관된 통합 수정 순서

구현은 **다음 지시 후**. 이번 단계는 순서만.

1. 세 레포가 **같은 계약 매니페스트·fingerprint·HEAD**를 읽게 맞춘다. 추측 path 금지.
2. 백엔드: 로그인 저장소가 ready로 실측되기 전에는 어드민이 비밀번호 성공을 열지 않는다. 열리면 `admin-session/login`만.
3. 어드민: 응답 `userId` 대조, 실패 토스트, 죽은 버튼, 빈 라우트, 배정 문구. 가짜 완료 방지 유지.
4. 백엔드: 회원 목록 저장소 또는 “UUID만”을 계약과 화면에 동일하게 고정. `/me/membership` 대체 금지.
5. 백엔드: 상품을 공용 행으로 persist. 기본 `all_public`. 선택 공개는 권한. **in-flight 슬롯을 회원별로 재해석**.
6. 어드민: 상품·구성·기준 금액·비용·지급액·공개범위·가격 메모 화면. 쓰기는 applied+재조회 후에만 완료.
7. 고객 웹: 공용 목록 + 개인 참여. 선택 공개는 서버 404. 금액은 서버 원장. 애니메이션/시간표 유지.
8. 금융·문의·AI·감사는 각 컨트롤러 필드를 한 경로씩. 카탈로그보다 뒤.

---

## 7. 수정 완료 판정에 필요한 시험

- 계약 fingerprint가 세 레포에서 동일하고, 어드민이 없는 URL을 만들지 않음.
- 비밀번호 로그인: 잘못된 비밀번호 401, unready 503≠완료, ready일 때만 쿠키. 사용자 `aipo_session`으로 관리자 진입 불가.
- 없는 회원 UUID 404. 다른 회원으로 치환 없음. 늦은 응답이 다른 UUID 화면에 안 섞임.
- cap 0 + 보너스 = 참여 가능량 0. 등급 기본 변경이 기존 명시 회원을 덮지 않음.
- 상품 A를 두 회원이 동시에 참여. A의 cap 0이 B를 막지 않음. 비대상은 목록·상세·직접 참여 404.
- 지급은 원장 재조회와 금액·통화가 일치. 프론트 합산 금지.
- 격리 시험 workers=1, 운영 host 0건. Playwright는 어드민용 egress 격리가 생긴 뒤에만.
- typecheck/lint/isolated-admin/build를 **그 커밋에서** 다시 돌려 exit 0.

---

## 하지 않은 것

- 앱 패치, 패키지 설치, API 추가, 프레임워크 교체
- commit/push/deploy
- 운영 API 호출
- 상품 관리 화면 구현(우선순위가 이 조사로 변경됨)
- 실패한 검사를 고쳐서 통과시키기

---

## 追記 2026-09-15 01:14+09 계약 재읽기

조사 당시 백엔드 HEAD `efdd6b74` 기록은 그 시각 스냅샷이다.  
이후 같은 브랜치 git HEAD는 `ec436d4d32937f2778b4b764e89918de2ca70280` + dirty. 매니페스트 파일 안 `head` 는 여전히 `efdd6b74`.  
BE-D04 소스 `user_id` 필터는 확인. 실 Postgres 동시성은 계속 BLOCKED.  
상품 `/catalog` 화면은 이후 OPS dirty에 있음. persist·출시 가능이 아니다.
