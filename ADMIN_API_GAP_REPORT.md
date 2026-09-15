# Admin API 간격

2026-09-15 재확인. 문서 선언 ≠ 컨트롤러 ≠ 저장소 준비 ≠ 화면 연결 ≠ 실제 효과.  
상세 차이: `ADMIN_CONTRACT_DIFF.md`.

어드민 상수 버전 `2026-09-14.b3.display-v19` / 백엔드 매니페스트 `2026-09-15.visibility-concurrent-v1`.

## 확인된 구현 (컨트롤러 존재)

| API | 권한 | CSRF | 저장소 | 화면 |
|---|---|---|---|---|
| GET/POST `/api/v1/admin-session` · POST `.../logout` | 토큰/쿠키 | 로그아웃 쓰기 | 세션 | 로그인 |
| POST `/api/v1/admin-session/login` | Guard 밖 | 첫 로그인 없음 | **항상 unready 503** | 화면 미호출 |
| GET `/api/v1/admin/users` | users read | GET 없음 | 빈 q 503. UUID면 membership 재사용 | 화면 미호출 |
| GET/PUT `/api/v1/admin/users/:id/membership` | userMembershipForce | PUT | 기존 membership 행 | `/users/:id` |
| GET/PUT `.../daily-match-cap` | userMatchPolicy | PUT | override. unready면 503 | `/users/:id` |
| GET `.../effective-preview` | userMembershipForce | GET | 조회 | 화면 미연결 |
| GET/PUT `.../bonus-grants` · PUT `.../reclaim` | userMatchPolicy | PUT | draft schema | `/users/:id` |
| GET `.../quota-projection` | userMembershipForce | GET | 조회 | 화면 미연결 |
| GET/PUT `/api/v1/admin/membership/grade-daily-caps` | userMatchPolicy | PUT | draft schema | `/membership/grades` |
| GET/PUT `/api/v1/admin/membership/presentation-profile` | userMatchPolicy | PUT | draft schema · GET은 컴파일 기본 | `/service/display-timing` |
| POST `/admin/opportunities/operator-products` 등 | all | 쓰기 | **항상 503** | `/catalog` 폼·수정·참여 조회. 목록 GET 없음. 저장 성공 아님 |

## 문서에만 있거나 여전히 소스에 없음

| 문서 경로 | 판단 | 화면 처리 |
|---|---|---|
| `POST /api/v1/admin-auth/login` | 컨트롤러 0. 실경로는 admin-session/login | 비밀번호 발명 안 함 |
| `GET /api/v1/admin/users/:id` · `POST .../pii-reveal` | 없음 | UUID 상세는 membership. 개인정보 버튼 disabled |
| 페이지 회원 목록 | 계약 BLOCKED | 첫 회원 대체 없음 |
| 카탈로그 실 persist | 셸만. 스키마 미적용 | 쓰기 화면 없음 |
| F09/F10 원장 조정 | dry-run/별면 | 금융 쓰기 안 염 |

## 존재하지만 이번 화면 미연결

| API | 이유 |
|---|---|
| KYC queue/approve/reject | 초안. 실회원 자료 안 염 |
| 출금 검토 · KRW 입금 검토 | 금융 쓰기 범위 밖 |
| 원장 journals / balance-adjust | F09/F10 |
| ops-inbox | 회원 UUID 확정 후 |
| audit events | 가짜 타임라인 없음 |
| AI logs | 미리보기 ≠ 대화 |
| execution-policy | 표시 Journey와 별개 |
| kill-switch / admin-ops | 승인 범위 |
| 기존 opportunities pricing / overrides | 쇼핑몰 visibility가 아님. 열지 않음 |

## 하지 않은 것

- 추가 지급/회수 URL 임의 생성
- schemaApplied/storeReady 를 true로 바꿈
- 운영 API/DB 호출
- 상품 화면 구현(조사 우선)
