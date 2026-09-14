# 퍼뜩 운영 화면 이식 감사

갱신: 2026-09-15 · 작업 폴더 `C:\Users\PC\Desktop\PUTDUK_OPS` · remote `https://github.com/phonarawd/putduk-ops.git` · branch `main` · HEAD `7b78beb93033da8b6c312f437762fd6b440e6ecf` + dirty

이 문서는 화면 연결 상태이지 운영 완료 선언이 아니다.  
전수조사 본문: `ADMIN_INVESTIGATION_20260915.md`.

2026-09-14 감사의 백엔드 HEAD `27b5b9f7` / 계약 `2026-09-14.b3.display-v19` 는 **그 시점** 기록이다.  
지금 읽은 백엔드는 `feat/operator-registered-catalog-s1` `efdd6b74` + dirty, 매니페스트 `2026-09-15.visibility-concurrent-v1`. 이전 PASS를 현재 PASS로 쓰지 않는다.

## 계약

- 어드민 상수(아직 미갱신): `2026-09-14.b3.display-v19` · HEAD `27b5b9f7`
- 백엔드 매니페스트: `2026-09-15.visibility-concurrent-v1` · HEAD `efdd6b74` · dirty
- user-bundle / display-vs-execution / presentation fingerprint는 매니페스트와 어드민 상수가 **일치**
- features-130 fingerprint는 **불일치** (`84c6d298…` vs `c6653aae…`)
- `schemaApplied=false` · `storeReady=false`
- `GET /api/v1/me/membership` 은 회원 본인용. 관리자 목록·타회원 조회로 쓰지 않음

## 인증 경계

| 항목 | 상태 | 근거 |
|---|---|---|
| 운영자 세션 쿠키 `aipo_admin_session` | 계약 확인 | 백엔드 admin-session |
| CSRF `aipo_admin_csrf` + `x-admin-csrf` | 계약 확인 | 쓰기만, 같은 주소 |
| issuer `ai-profit-os-admin` / aud `aipo-ops` | 계약 확인 | 사용자 JWT와 분리 |
| `POST /api/v1/admin-auth/login` | 컨트롤러 없음 | 어드민 문서의 옛 path |
| `POST /api/v1/admin-session/login` | dirty 존재 · 항상 503 | 자격 저장소 unready |
| 사용자 `aipo_session` | 관리자 인증 금지 | 지킴 |
| ChatGPT / localStorage 역할 토글 | 관리자 권한 금지 | AdminApp 미사용. 헬퍼 파일은 잔존 |
| 격리 시험 로그인 | 루프백 + 명시 플래그만 | 운영 우회 아님 |

## 기능 상태

| 기능 | 화면 | Admin API | 권한/CSRF | 구현 |
|---|---|---|---|---|
| 운영자 세션 확인·로그아웃 | `/login` | `GET/POST /admin-session` | 로그아웃 CSRF | 연결. 비밀번호는 대기 |
| 회원 검색 | `/users` | dirty `GET /admin/users` (빈 q 503, UUID 재사용) | users read | 화면은 UUID 이동만 |
| 회원 기회·등급 | `/users/:id` | membership / cap / bonus / force | userMatchPolicy · userMembershipForce | 어댑터 연결. unready면 실패 |
| 등급별 하루 기회 | `/membership/grades` | grade-daily-caps | userMatchPolicy | 연결 |
| 화면 진행 시간 | `/service/display-timing` | presentation-profile | userMatchPolicy | 연결. 실행 정책과 분리 |
| 상품 | 없음 | dirty operator-products 항상 503 | all write | 화면 없음. 배정 문구 잔존 |
| 문의·AI·입출금·공지·직원 | 기존 메뉴 | 일부 Nest 존재 | 메뉴 숨김 ≠ 보호 | 초안 |

## 소비자

- 이 레포 운영 화면
- 사용자 웹 Journey 소비는 다른 레포. 문서만으로 시간 설정 완료가 아님
- 고객 웹에서 Admin API 호출은 조사 시점 `src`에 없음
