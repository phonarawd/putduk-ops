# MINE-006 광산 운영콘솔

- 기준일: 2026-09-21
- 상태: **BLOCKED / NOT CLOSED**
- Ops repo: `phonarawd/putduk-ops`
- branch: `phase/mine-ops-console-20260921`
- exact base: `070c98e7b28a37c0a615baac18ebd9631ceab2ce`
- Backend API authority: `phonarawd/AI-Profit-OS`
- Backend branch: `phase/mine-admin-api-20260921`
- Backend authority SHA: `8630dbf7c197c37c9888fd66588e5976af56059c`
- mining contract: `2026-09-20.mine-v1`
- Production Supabase: `mgsytcetsiecllmhcyox`

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

Backend repo도 PHASE06에서 수정하지 않았다.

## 3. Maker / Checker

UI는 현재 session `adminId`와 rate `createdByAdminId`가 같으면 승인 버튼을 비활성화한다.

Backend authority는 별도로 다음을 강제한다.

- rate creator와 checker가 동일하면 거부
- approval request maker와 checker가 동일하면 거부
- DB no-self-approval constraint 유지

따라서 UI 방어를 우회해도 서버가 self approval을 거부한다.

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

## 6. 정적 gate

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

현재 환경에서는 fresh checkout `node quality/mining/phase06_ops_console_assertions.mjs`, `pnpm typecheck`, `pnpm lint`, `pnpm build`를 실행할 runner를 확보하지 못했다.

따라서 위 gate는 **NOT RUN**이며 PASS로 기록하지 않는다.

GitHub Actions는 이전 PHASE에서 quota exhausted 상태이며, 현재 PHASE06 HEAD에 연결된 run도 확인되지 않았다.

기록:

`NOT RUN / quota exhausted`

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

`admin_rbac`에서 `active=true` row는 현재 0이었다.

민감 인증값/password hash는 읽지 않았다.

## 8. Live Nest API blocker

현재 Ops가 고정 사용 중인 upstream:

`https://api.hiptk.app`

2026-09-21 확인:

```text
GET /api/v1/health                         -> HTTP 503
GET /api/v1/admin/mines                    -> HTTP 503
GET /api/v1/admin/system-control/switches  -> HTTP 503
```

따라서 현재 public origin에서 실제 Nest admin API E2E를 수행할 수 없다.

PHASE05의 Render verify service `putduk-mine-phase05-admin-verify`도 실제 Nest API가 아니다.
그 서비스의 start command는 단순 `ok` HTTP server이며 build validation 전용이다.

## 9. PHASE06 E2E gate

필수 실제 흐름:

```text
광산 생성
-> 수익률 초안
-> 승인 요청
-> 다른 운영자 승인
-> 즉시 적용 또는 예약
-> 광산 공개
```

현재 이 gate는 실행 불가하다.

독립 blocker:

1. public Nest API origin이 HTTP 503
2. production 활성 admin이 1명뿐이라 maker/checker 2 identity 조건 불충족
3. fresh-checkout frontend build runner를 현재 세션에서 확보하지 못함

두 번째 admin 계정을 임의 생성하거나 production test mine을 삽입하여 gate를 우회하지 않았다.

## 10. Verdict

`MINE-006 = BLOCKED / NOT CLOSED`

구현 코드는 브랜치에 존재하지만 PHASE06 완료 조건은 실제 Nest E2E를 요구한다.

따라서 현재 상태를 PASS/CLOSED라고 기록하지 않는다.

PHASE07은 시작하지 않는다.
