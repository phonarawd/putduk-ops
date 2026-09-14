# Backend Gap Register

2026-09-15 전수조사로 갱신. 상세는 `ADMIN_API_GAP_REPORT.md`, `ADMIN_CONTRACT_DIFF.md`.

Frontend Prototype이 존재한다고 Backend 기능이 완료된 것은 아니다.

| 화면 기능 | 현재 판단 | 이식 시 확인 |
|---|---|---|
| Admin 비밀번호 로그인 | dirty `POST /admin-session/login` · 항상 503. `admin-auth/login` 없음 | 자격 저장소 ready 실측 |
| Admin 회원 목록 | dirty `GET /admin/users` · 빈 q 503 · UUID 재사용만 | 페이지 저장소. `/me/membership` 대체 금지 |
| 개인정보 열람 | 컨트롤러 없음 | 열람 이유·기록 |
| 회원 기회·등급·보너스 | 컨트롤러 있음 · persist unready | 503≠완료 |
| 상품 등록·공개 | 셸 있음 · persist 0. 슬롯 SQL은 user_id 확인, 실DB 동시성 BLOCKED | visibility enum persist · operatorMemo 필드 |
| 출금 검토 | 컨트롤러 있음 | 2인 승인·중복 방지 |
| 퍼뜩 AI 대화 | 로그 컨트롤러 있음 | preview ≠ transcript |
| 공지·이벤트 | 이 조사에서 전 모듈 미확인 | 수명주기. “없음” 단정 금지 |
| 안전 알림 | risk 컨트롤러 있음 | 자동 결과와 수동 결정 분리 |
| 서비스 중지 | kill-switch 있음 | 범위·승인 기록 |
| 리셀러 ID | 소스 컬럼 있음 · 라이브 정확 조회 DTO에 없음 | 가입 mint + Admin HTTP 배선 |

Frontend Prototype이 존재한다고 Backend 기능이 완료된 것은 아니다.
