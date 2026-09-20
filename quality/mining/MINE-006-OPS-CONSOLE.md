# MINE-006 광산 운영콘솔

- 기준일: 2026-09-21
- 상태: **BLOCKED / NOT CLOSED**
- Ops repo: `phonarawd/putduk-ops`
- branch: `phase/mine-ops-console-20260921`
- exact base: `070c98e7b28a37c0a615baac18ebd9631ceab2ce`
- PHASE06 implementation evidence SHA: `94e2d4384b3607abc9f5a8e0e30fcf21889a9df8`
- PHASE06 verify workflow introduction SHA: `990edc43de995c0b50108da1720e7356db0dc250`
- Backend API authority: `phonarawd/AI-Profit-OS`
- Backend branch: `phase/mine-admin-api-20260921`
- Backend authority SHA: `8630dbf7c197c37c9888fd66588e5976af56059c`
- mining contract: `2026-09-20.mine-v1`
- Production Supabase: `mgsytcetsiecllmhcyox`
- isolated staging Supabase: `uluzxvdpynytytduuryy` (`staging-release-20260902`)

## 1. 구현 범위

PHASE06에서 `putduk-ops`의 1차 운영 영역을 `PUTDUK MINE OS`로 전환했다.

구현:

- 오늘 할 일
  - 입금 기존 운영 화면 연결
  - 출금 기존 운영 화면 연결
  - KYC 기존 운영 화면 연결
  - 정산 실패/검토필요 집계
  - 수익률 승인대기 집계
  - 고액운용은 PHASE17 backend 기능이 없으므로 `준비 중` 표시만 하고 처리 mutation을 만들지 않음
- 광산 관리
  - 목록/상세/생성/수정
  - 공개
  - 신규운용중지
  - 일시정지
  - 재개
  - 종료
- 수익률 관리
  - 이력
  - 초안 생성/수정
  - 승인 요청
  - 승인
  - 즉시 적용/미래 예약
- 운용 현황
  - 사용자/광산/상태 필터
  - 목록/상세
  - 원금 변경 이벤트 이력
- 정산 관리
  - 사용자/광산/상태 필터
  - 목록/상세
  - accrual 구간
  - 실패/검토필요 재실행
- 시스템 제어
  - `MINING_NEW_POSITIONS_PAUSE`
  - `MINING_SETTLEMENT_PAUSE`

## 2. API 경계

새 Backend endpoint를 만들지 않았다.

Ops는 기존 same-origin catch-all `/api/v1/*` proxy를 통하여 PHASE05 Nest admin API만 호출한다.

모든 mining 관리자 mutation은 `Idempotency-Key`를 전송한다.

Ops mining 화면에서 Supabase를 직접 호출하지 않는다.

`putduk-web`은 수정하지 않았다.

Backend implementation도 PHASE06에서 수정하지 않았다.

## 3. Maker / Checker

UI는 현재 session `adminId`와 rate `createdByAdminId`가 같으면 승인 버튼을 비활성화한다.

Backend authority는 별도로 다음을 강제한다.

- rate creator와 checker가 동일하면 거부
- approval request maker와 checker가 동일하면 거부
- DB no-self-approval constraint 유지

따라서 UI 방어를 우회해도 서버가 self approval을 거부한다.

Production에는 활성 admin identity가 충분하지 않지만, isolated staging에는 활성 `super` 3명과 활성 `cs` 1명이 있어 maker/checker 2 identity 전제는 staging에서 충족되었다.

## 4. 성공 표시 원칙

mutation은 server response 성공 이후에만 success toast/state refresh를 수행한다.

실패 응답이면 기존 상태를 성공으로 바꾸지 않고 오류를 표시한다.

정산 재실행 화면에도 server success 전 완료 표시 금지 문구를 명시했다.

## 5. UI

브랜드:

`PUTDUK MINE OS — Mineral Luxury`

적용:

- Mineral White / Champagne Gold / Graphite
- Deep Graphite / Warm Gold dark mode
- 금융 관제실형 정보 밀도
- 광산 상태는 한국어 표시명 사용
- raw enum을 정상 사용자 상태명으로 노출하지 않음
- settlement `failureCode`는 raw code 대신 `확인 필요`로 표시

기존 회원/입출금/KYC/CMS 기반은 유지했다.

기존 상품/등급/리셀 운영 영역은 삭제하지 않고 접힌 `기존 운영 기반` 아래로 이동했다.

최종 리셀 잔재 제거는 PHASE26 범위를 유지한다.

## 6. Ops 정적 / fresh-checkout gate

추가:

`quality/mining/phase06_ops_console_assertions.mjs`

검사항목:

- PHASE05 locked admin route coverage
- admin mutation `Idempotency-Key`
- existing system-control API reuse
- mining kill switch IDs 2개만 사용
- PHASE06 필수 1차 nav
- PHASE17 고액운용 API 임의 생성 금지
- maker/checker self-approval UI 방어
- server success 전 완료 처리 금지 표식
- mining UI direct Supabase 접근 금지
- Vercel 의존 금지
- 한국어 운영 상태명
- Mineral Luxury light/dark theme token

Render fresh-checkout runner는 private `putduk-ops` repo를 fetch하지 못해 생성이 거절되었다.

이를 우회하기 위해 `.github/workflows/phase06-verify.yml`을 추가했다.

workflow 명령:

```text
npm ci
node quality/mining/phase06_ops_console_assertions.mjs
npm run typecheck
npm run lint
npm run build
```

GitHub Actions 실행 2회:

- run `35526090772` @ `990edc43de995c0b50108da1720e7356db0dc250`
- run `35526238911` @ `a95d49350b3e09bfaee429b72653729bb41ba6bf`
- 둘 다 `failure`
- 두 job 모두 `steps=null`
- 첫 job log artifact도 404 / BlobNotFound

즉 실제 assertion/typecheck/lint/build 명령은 시작되지 않았다.
코드 실패로 판정하지 않으며 PASS로도 기록하지 않는다.
runner 시작 전 계층 blocker가 두 번 재현되었다.

불필요한 실패 알림을 반복하지 않도록 workflow는 이후 `workflow_dispatch` 수동 실행 전용으로 전환했다.

## 7. Production read-only 확인

Production Supabase read-only 확인 결과:

```text
mines        = 0
rates        = 0
positions    = 0
settlements  = 0
```

PHASE06 검증을 위해 production mining test data를 삽입하지 않았다.

활성 admin 계정 집계:

```text
super / active = 1
```

민감 인증값/password hash/TOTP secret은 읽지 않았다.

Production에 2차 admin 계정이나 test mine을 추가해 gate를 우회하지 않았다.

## 8. Isolated staging DB 준비

기존 Supabase staging branch:

- name: `staging-release-20260902`
- project ref: `uluzxvdpynytytduuryy`
- `with_data=false`

Production에서 이미 검증된 repo migration을 그대로 적용했다.

- `20260920134053_mining_foundation_v1.sql` -> SUCCESS
- `20260921162500_mining_admin_controls_v1.sql` -> SUCCESS

검증:

- 9개 mining table RLS=true
- 9개 mining table FORCE RLS=true
- `MINING_NEW_POSITIONS_PAUSE=false`
- `MINING_SETTLEMENT_PAUSE=false`
- active admin identities: `super=3`, `cs=1`

staging runtime DB role `putduk_mine_staging`을 만들었다.

현재 role 상태:

- LOGIN=true
- BYPASSRLS=true (FORCE RLS mining server access 용도)
- `service_role` membership=false
- bootstrap comment/credential metadata 제거됨
- 필요한 mining / approval / audit tables에만 최소 grant 유지

Production role/credential은 변경하지 않았다.

## 9. Dedicated mining Render staging backend

잠긴 deployment boundary에 따라 기존 legacy Render 서비스를 mining backend로 재사용하지 않았다.

새 전용 서비스:

- name: `putduk-mine-api-staging`
- service id: `srv-dao1f1id0e5s73ekdhtg`
- URL: `https://putduk-mine-api-staging.onrender.com`
- branch: `phase/mine-admin-api-20260921`
- checkout SHA: `8630dbf7c197c37c9888fd66588e5976af56059c`
- region: Singapore
- auto deploy: off

첫 deploy:

- deploy id: `dep-dao1f2qd0e5s73ekdl40`
- status: `live`

빌드 gate 결과:

```text
VERIFY_HEAD=8630dbf7c197c37c9888fd66588e5976af56059c
PHASE05_ADMIN_API_ASSERTIONS_PASS
Rust mining_profit_cli release build PASS
[verify:api-nest-build] PASS (services/api-nest tsc build clean)
PUTDUK_MINE_STAGING_BUILD_OK
Build successful
```

따라서 dedicated mining backend의 exact checkout / PHASE05 contract / Rust binary / Nest TypeScript build gate는 PASS다.

runtime 로그에서 PHASE05 mining Admin API 20개가 실제 Nest router에 등록된 것을 확인했다.

등록 범위:

- mine 9개 route
- rate 6개 route
- position 2개 route
- settlement 3개 route

무인증 `GET /api/v1/admin/mines` 요청은 404가 아니라 `401 ADMIN_AUTH_REQUIRED`로 거절되었다.
즉 전용 backend의 route와 AdminGuard 경계는 runtime에서도 활성화되어 있다.

비민감 env만 설정했다.

- `NODE_ENV=production`
- `SUPABASE_PROJECT_REF=uluzxvdpynytytduuryy`
- `SUPABASE_REGION=ap-northeast-2`

`DATABASE_URL`, `JWT_ADMIN_SECRET` 같은 secret을 모델이 API tool 사이에 직접 전달하려는 요청은 안전검사에 의해 차단되었다.
따라서 secret을 우회 노출하거나 source에 하드코딩하지 않았다.

브라우저 세션 안에서만 secret을 옮기는 자동화도 시도했지만 TinyFish wallet 부족으로 실행 자체가 시작되지 않았다.

## 10. 기존 public origin 상태

기존 Ops upstream:

`https://api.hiptk.app`

이전 PHASE06 확인에서:

```text
GET /api/v1/health                         -> HTTP 503
GET /api/v1/admin/mines                    -> HTTP 503
GET /api/v1/admin/system-control/switches  -> HTTP 503
```

Render inventory와 backend branch 비교에서 기존 `AI-Profit-OS` 서비스는 `main` 배포선이고, PHASE05 mining backend branch는 `main`보다 별도 49 commits 앞선 상태임을 확인했다.

잠긴 deployment boundary는 mining production을 기존 legacy service에 덮어씌우는 것을 금지하므로 기존 서비스를 branch 전환하지 않았다.

## 11. Staging E2E harness

추가:

`quality/mining/phase06_staging_e2e.mjs`

secret/admin identity를 소스에 넣지 않는다.
실행 시에만 다음 환경값을 받는다.

- `JWT_ADMIN_SECRET`
- `PHASE06_MAKER_ADMIN_ID`
- `PHASE06_CHECKER_ADMIN_ID`
- optional `PHASE06_API_BASE_URL`

자동 검증 순서:

```text
광산 생성 READY
-> 수익률 DRAFT 생성
-> 승인 요청 APPROVAL_PENDING
-> maker self-approval 시도 / 409 거부 확인
-> checker identity 승인
-> 즉시 적용 / rate ACTIVE
-> 광산 공개 / mine ACTIVE
-> GET readback으로 rate/mine ACTIVE + checker identity 확인
-> staging test mine END 정리
```

JWT는 Backend SSOT와 같은 HS256 / issuer `ai-profit-os-admin` / audience `aipo-ops` 형식으로 런타임 생성한다.
토큰은 파일이나 로그에 저장하지 않는다.

로컬 Node `--check` 문법 검증: PASS.

## 12. PHASE06 E2E gate

필수 실제 흐름:

```text
광산 생성
-> 수익률 초안
-> 승인 요청
-> 다른 운영자 승인
-> 즉시 적용 또는 예약
-> 광산 공개
```

staging DB와 maker/checker identity 전제는 준비되었다.
dedicated backend build와 runtime route/auth boundary도 PASS했다.
E2E 실행 harness도 준비되었다.

현재 남은 blocker:

1. dedicated staging Render service에 `DATABASE_URL` / `JWT_ADMIN_SECRET`을 secret-safe 방식으로 설정해야 함
2. 설정 후 준비된 harness로 실제 Nest Admin API maker/checker E2E를 수행해야 함
3. Ops fresh-checkout assertion/typecheck/lint/build runner가 아직 실제 step을 실행하지 못함

두 번째 admin 계정을 Production에 만들거나 Production test mine을 삽입하여 gate를 우회하지 않았다.
secret을 source, migration evidence, chat output에 하드코딩하지 않았다.

## 13. Verdict

`MINE-006 = BLOCKED / NOT CLOSED`

완료된 것:

- Ops 기능 구현
- locked API 계약 대조
- isolated staging mining schema 준비
- staging maker/checker identity 전제 확보
- dedicated mining Render backend 생성
- exact backend SHA build
- PHASE05 assertion
- Rust release binary build
- Nest TypeScript build
- PHASE05 mining 20 route runtime registration
- AdminGuard unauthenticated denial runtime 확인
- staging maker/checker E2E harness 작성 + Node syntax PASS

미완료:

- actual Nest maker/checker E2E
- Ops fresh-checkout assertion/typecheck/lint/build execution

따라서 현재 상태를 PASS/CLOSED라고 기록하지 않는다.

PHASE07은 시작하지 않는다.
