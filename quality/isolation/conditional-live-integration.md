# 조건부 실통합 — 준비만

이 문서는 **실행 권한이 확인되기 전 초안**이다.  
지금 상태에서는 `BLOCKED`. 운영 host·운영 DB·실회원·실지급·외부 발송을 호출하지 않는다.

화면 준비 ≠ mock 검증 ≠ 실제 저장·지급 ≠ 출시 가능.

## 백엔드에서 읽은 이름만

| 이름 | 출처 | 이 레포에서 하는 일 |
|---|---|---|
| `CATALOG_TEST_DATABASE_URL` | 백엔드 persist 계약 · `operator-mall-product.persist.cjs` | 값이 있어도 OPS가 DB에 직접 붙지 않음. Nest mall persist도 앱 `DATABASE_URL`을 쓰지 않음 |
| `DATABASE_URL` | 백엔드 `.env.example` | **쓰지 않음**. mall persist 금지 |
| `PUTDUK_ADMIN_API_ORIGIN` / `NEXT_PUBLIC_PUTDUK_ADMIN_API_ORIGIN` | OPS `origin.ts` | 루프백일 때만 live 모드. 없으면 waiting. `api.hiptk.app` 추측 금지 |
| `PUTDUK_OPS_ALLOW_LOCAL_NEST` | **OPS 실행 스위치. 백엔드 계약 env가 아님** | 1이 아니면 연결 안 함 |
| `PUTDUK_OPS_RUN_LOCAL_NEST` | **OPS 실행 스위치. 백엔드 계약 env가 아님** | 1이 아니면 연결 안 함 |

없는 Admin 상품 목록/단건 GET URL을 만들지 않는다.  
직원 자격 저장소 ACK · 스키마 apply · 원장 저널 실측 전에는 로그인/저장/지급 완료로 쓰지 않는다.

## 백엔드 준비 후 실행할 절차

1. 백엔드가 **승인된 localhost 격리 Nest**와, 계약에 적힌 `CATALOG_TEST_DATABASE_URL` 격리 Postgres를 켰는지 Human이 확인한다. 운영 `DATABASE_URL`이면 중단.
2. persist-status `schemaApplied` / `storeReady` / staff store ACK를 **서버 응답으로** 다시 읽는다. 문자열·mock으로 ready를 만들지 않는다.
3. OPS를 루프백에서 띄운다. `PUTDUK_ADMIN_API_ORIGIN` = 그 Nest origin (`http://127.0.0.1:<port>`).
4. `PUTDUK_OPS_ALLOW_LOCAL_NEST=1` 과 `PUTDUK_OPS_RUN_LOCAL_NEST=1` 을 Human이 명시한다. 스크립트 기본값은 둘 다 꺼짐.
5. 먼저 `GET /api/v1/admin-session` 만. 쿠키·CSRF 없이 쓰기 금지.
6. `POST /api/v1/admin-session/login` — 503 `STORE_UNREADY` `applied=false` 이면 완료가 아님. 성공 쿠키는 staff store ready 실측 후에만.
7. `GET /api/v1/admin/users?q=<실UUID 아님, 격리 픽스처 UUID>` — 빈 q로 목록 성공 위장 금지.
8. 회원 cap/bonus/grade/presentation 쓰기 후 **같은 ID 재조회**. 저장 성공 ≠ 재조회 성공.
9. 상품 POST/PATCH/GET participations. 목록 GET은 없음. `priceConfirmationMemo` 재조회. revision 409면 다시 읽기.
10. 참여·지급은 `moneyAuthority.payoutAuthoritative` + `ledgerJournalId` + `ledgerPaidUsdt` 가 함께 있을 때만 완료. 예상액·설정액·클라이언트 계산·저널 없는 settled 금지.
11. `npm run qa:min-integration` 은 mock 게이트다. 위 실연결을 대체하지 않는다.

## 지금 하면 안 되는 것

- 운영 `https://api.hiptk.app` 연결 시험
- 실회원 UUID로 지급/회수
- 스크립트가 `DATABASE_URL` 을 읽어 mall persist
- 실행 스위치 없이 이 문서를 PASS로 기록
