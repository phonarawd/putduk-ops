# MINE-006 광산 운영콘솔

- 기준일: 2026-09-21
- 상태: **BLOCKED / NOT CLOSED**
- Ops repo: `phonarawd/putduk-ops`
- Ops branch: `phase/mine-ops-console-20260921`
- Ops HEAD: `87b2c2145bda14bf4cc3c7968a0bc205cacb877d`
- exact base: `070c98e7b28a37c0a615baac18ebd9631ceab2ce`
- Backend API authority: `phonarawd/AI-Profit-OS`
- Backend branch: `phase/mine-admin-api-20260921`
- Backend clean validation HEAD: `d6e279841aaa62b7b75f26a7b33d1768923d551b`
- Backend real E2E bugfix commit: `ac55dd67ed77859fd9617f956131e5d6acd5270a`
- mining contract: `2026-09-20.mine-v1`
- staging Supabase project ref: `mgsytcetsiecllmhcyox`
- staging Render service: `putduk-mine-api-staging` (`srv-dao1f1id0e5s73ekdhtg`)
- Production은 PHASE06 검증 중 변경하지 않음

## 1. 구현 범위

PHASE06에서 `putduk-ops`의 1차 운영 영역을 `PUTDUK MINE OS`로 전환했다.

구현 범위:

- 오늘 할 일
  - 입금/출금/KYC 기존 운영 화면 연결
  - 정산 실패/검토필요 집계
  - 수익률 승인대기 집계
  - PHASE17 고액운용 backend가 없으므로 준비 중 표시만 유지
- 광산 관리
  - 목록/상세/생성/수정
  - 공개
  - 신규운용중지
  - 일시정지/재개/종료
- 수익률 관리
  - 이력
  - 초안 생성/수정
  - 승인 요청
  - maker/checker 승인
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

## 2. API / 권한 경계

Ops는 기존 same-origin `/api/v1/*` proxy를 통해 PHASE05 Nest admin API를 호출한다.

- mining 관리자 mutation은 `Idempotency-Key`를 사용
- Ops mining 화면에서 Supabase 직접 호출 금지
- `putduk-web` 변경 없음
- PHASE17 기능을 임의 API로 생성하지 않음

Maker/checker는 UI와 backend 양쪽에서 방어한다.

- UI: 현재 session `adminId`와 rate maker가 같으면 승인 action 차단
- backend: maker와 checker가 같으면 거부
- DB no-self-approval invariant 유지

실제 staging E2E에서 maker self-approval의 `409` 거부를 확인했다.

## 3. 성공 표시 원칙

mutation은 server response 성공 이후에만 success toast/state refresh를 수행한다.

실패 응답에서는 기존 상태를 성공으로 바꾸지 않는다.
정산 재실행도 server success 전 완료로 표시하지 않는다.

## 4. UI

브랜드:

`PUTDUK MINE OS — Mineral Luxury`

적용:

- Mineral White / Champagne Gold / Graphite
- Deep Graphite / Warm Gold dark mode
- 금융 관제실형 정보 밀도
- 한국어 광산 상태명
- settlement raw `failureCode` 대신 운영자용 `확인 필요` 표시

기존 회원/입출금/KYC/CMS 기반은 유지한다.
기존 리셀 운영 영역의 최종 정리는 PHASE26 범위를 유지한다.

## 5. Ops 정적 검증 계약

검증 파일:

`quality/mining/phase06_ops_console_assertions.mjs`

검사항목:

- PHASE05 locked admin route coverage
- admin mutation `Idempotency-Key`
- existing system-control API reuse
- mining kill switch ID 제한
- PHASE06 필수 1차 nav
- PHASE17 API 임의 생성 금지
- maker/checker self-approval UI 방어
- server success 전 완료 표시 금지
- mining UI direct Supabase 접근 금지
- Vercel 의존 금지
- 한국어 운영 상태명
- Mineral Luxury light/dark theme token

Canonical fresh-checkout gate 명령은 다음과 같다.

```text
npm ci
node quality/mining/phase06_ops_console_assertions.mjs
npm run typecheck
npm run lint
npm run build
echo PHASE06_VERIFY_OK
```

## 6. GitHub Actions runner blocker

현재 GitHub Actions CI 한도/runner 계층 문제로 canonical workflow가 step 실행 전에 종료된다.

현재 Ops HEAD의 workflow run:

- run: `35530390739`
- SHA: `87b2c2145bda14bf4cc3c7968a0bc205cacb877d`
- 재실행 attempt 포함 반복 확인
- job status: failure
- `steps=null`
- 실제 `npm ci` / assertion / typecheck / lint / build는 시작되지 않음

따라서 이 failure는 source-code failure로 판정하지 않는다.
동시에 실제 명령이 실행되지 않았으므로 PASS로도 인정하지 않는다.

## 7. Render 대체 runner 조사

GitHub Actions quota를 우회하기 위해 Render fresh runner를 여러 방식으로 조사했다.

확인 결과:

- Render Git integration은 `AI-Profit-OS` private repo는 checkout 가능
- `putduk-ops` private repo에는 직접 integration access가 없음
- build 단계에서는 source checkout credential/remote가 재사용되지 않음
- HTTPS direct clone은 private repo authentication에서 차단
- SSH clone/submodule은 reusable GitHub deploy key가 없어 차단
- private submodule 방식도 build 단계에서 원본 Ops checkout을 만들지 못함

한 probe는 앞선 실패 이후 shell이 계속 진행되어 문자열 `PHASE06_VERIFY_OK`를 출력했으나 `set -e`가 없던 잘못된 probe였다.
이 marker는 **무효**로 처리했으며 Gate PASS 증거로 사용하지 않는다.

## 8. Historical fresh-build baseline evidence

과거 `putduk-ops`의 GitHub Actions 성공 run을 확인했다.

- workflow: `deploy-ops`
- run: `35116115057`
- fresh checkout SHA: `8e796f4d5bcf2e334df3e2e6f29f14e3d5480e29`
- `actions/checkout@v5`: clean checkout, depth 1
- `npm ci`: PASS, 705 packages
- `npm run build`: PASS
- vinext client/server/RSC/client/SSR 5단계 build: PASS
- Cloudflare deploy + origin/public smoke: PASS

이는 full-repo fresh-checkout/build 파이프라인의 과거 정상 동작 증거다.
다만 현재 HEAD 검증은 아니므로 canonical Gate 2의 대체 PASS로 단독 사용하지 않는다.

`8e796f4...`에서 현재 `87b2c214...`까지 package manifest와 lockfile은 변경되지 않았다.
변경 범위는 PHASE06 실행 코드/검증/문서 14개 파일이다.

현재 HEAD와 직전 `f5ec9c1b...`의 차이는 `.github/workflows/phase06-verify.yml` push trigger 3줄뿐이며 애플리케이션 source 차이는 없다.

## 9. Dedicated staging backend

Render staging:

- name: `putduk-mine-api-staging`
- service id: `srv-dao1f1id0e5s73ekdhtg`
- URL: `https://putduk-mine-api-staging.onrender.com`
- branch: `phase/mine-admin-api-20260921`
- region: Singapore
- auto deploy: off

빌드 검증에서 다음을 확인했다.

```text
PHASE05_ADMIN_API_ASSERTIONS_PASS
Rust mining_profit_cli release build PASS
[verify:api-nest-build] PASS
PUTDUK_MINE_STAGING_BUILD_OK
Build successful
```

runtime에서 PHASE05 mining Admin API route가 등록되고 AdminGuard가 활성화된 것도 확인했다.

Production Render service/branch는 PHASE06 검증을 위해 변경하지 않았다.

## 10. Staging DB / identity 준비와 정리

실제 E2E 대상 staging Supabase:

- project ref: `mgsytcetsiecllmhcyox`

E2E를 위해 staging 전용 maker/checker identity와 ephemeral DB bootstrap을 사용했다.
민감 secret/JWT/password는 source 또는 로그에 저장하지 않았다.

검증 완료 후 정리:

- ephemeral DB credential table 제거
- 임시 DB login role: `NOLOGIN`
- 임시 DB role: `NOBYPASSRLS`
- role password 제거
- maker/checker test admin identity inactive 처리
- bootstrap Edge Function은 retired 상태로 봉인되어 `410` 응답
- backend self-test flag 비활성화
- temporary runtime self-test/bootstrap source 제거

Production DB/admin identity/test mine은 변경하지 않았다.

## 11. Real maker/checker E2E — PASS

실제 dedicated staging Nest API를 통한 흐름을 실행했다.

```text
광산 생성 READY
-> 수익률 DRAFT 생성
-> 승인 요청 APPROVAL_PENDING
-> maker self-approval 시도 / 409 거부
-> checker identity 승인
-> 즉시 적용 / rate ACTIVE
-> 광산 공개 / mine ACTIVE
-> GET readback으로 ACTIVE + checker identity 확인
-> staging test mine END 정리
```

최종 로그 marker:

```text
PHASE06_STAGING_E2E_PASS
```

따라서 **Gate 1은 PASS**다.

## 12. E2E 과정에서 발견한 backend 결함과 수정

실제 E2E 중 `POST /api/v1/admin/mines`가 PostgreSQL 오류로 500을 반환했다.

오류:

```text
inconsistent types deduced for parameter $1
```

원인은 `admin_audit_events` insert에서 동일 `$1`을 `actor_key` text와 `$1::uuid` actor_id로 동시에 사용한 것이었다.

수정:

- `actor_key`: `$1::uuid::text`
- `actor_id`: `$1::uuid`

실제 bugfix commit:

`ac55dd67ed77859fd9617f956131e5d6acd5270a`

수정 후 maker/checker E2E가 최종 PASS했다.

E2E 전용 self-test/bootstrap source는 이후 제거했고 clean backend validation HEAD는:

`d6e279841aaa62b7b75f26a7b33d1768923d551b`

실제 audit typing bugfix는 clean tree에 유지한다.

## 13. Closure gates

| Gate | 상태 | 증거 |
| --- | --- | --- |
| staging maker/checker E2E | **PASS** | `PHASE06_STAGING_E2E_PASS` |
| Ops current-HEAD fresh-checkout verify | **BLOCKED** | GitHub Actions quota/runner zero-step failure; Render private-repo checkout unavailable |

Gate 2 canonical 성공 조건은 현재도 다음 marker다.

```text
PHASE06_VERIFY_OK
```

실제 current-HEAD fresh checkout에서 assertion/typecheck/lint/build가 모두 성공한 뒤에만 이 marker를 인정한다.

## 14. Verdict

`MINE-006 = BLOCKED / NOT CLOSED`

완료:

- Ops 기능 구현
- locked API 계약 대조
- dedicated staging backend build/runtime 확인
- real maker/checker E2E
- maker self-approval 409 거부 확인
- staging readback/cleanup
- E2E 중 발견된 real backend audit SQL bug 수정
- temporary self-test/bootstrap 제거 및 staging hardening

남은 closure blocker:

- **Ops current-HEAD fresh-checkout assertion/typecheck/lint/build 실행 성공 및 `PHASE06_VERIFY_OK` 확보**

GitHub Actions quota/runner blocker를 source failure로 오판하지 않는다.
과거 baseline build 성공이나 실패 뒤 출력된 marker를 Gate 2 PASS로 승격하지 않는다.

두 closure gate가 모두 PASS하기 전에는 CLOSED로 기록하지 않는다.
PHASE07은 시작하지 않는다.
