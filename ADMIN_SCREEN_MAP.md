# Admin Screen Map

2026-09-15 전수조사: 버튼·API·상태 전체는 `ADMIN_SURFACE_MATRIX.md`.  
이 표는 주소 목록이다. HEAD `7b78beb` + 워킹트리.

| 주소 | 화면명 | 상태 |
|---|---|---|
| `/login` | 운영자 로그인 | 세션 조회 연결. live는 `POST /admin-session/login` 제출. 503=준비 중. 성공 mock 없음 |
| `/` | 오늘 할 일 | 초안. 가짜 ID/완료 버튼 없음 |
| `/users` | 회원 찾기 | UUID 한 건 조회. 페이지 목록 없음 |
| `/users/[id]` | 회원 기회·등급 | 어댑터 연결. 개인정보/제한은 미연결 |
| `/membership/grades` | 등급별 하루 기회 | 연결 |
| `/service/display-timing` | 화면 진행 시간 | 연결 |
| `/support` | 문의함 | 초안 |
| `/conversations/ai`, `/conversations/ai/[id]` | 퍼뜩 AI 대화 | 초안. 내용 안 염 |
| `/money/deposits`, `/money/withdrawals`, `/money/transactions`, `/money/mismatches` | 돈과 거래 | 초안. 하위 주소가 한 화면 |
| `/identity` | 본인 확인 | 초안 |
| `/content/notices`, `/content/events`, `/content/benefits`, `/content/banners`, `/content/messages` | 공지와 이벤트 | 초안 |
| `/safety/alerts`, `/safety/cases`, `/safety/lists`, `/safety/limits` | 안전 관리 | 초안 |
| `/reports` | 운영 현황 | 초안 |
| `/staff`, `/staff/approvals`, `/activity`, `/activity/access` | 직원과 기록 | 초안 |
| `/service`, `/service/incidents`, `/service/maintenance`, `/service/controls` | 서비스 설정 | 초안 |
| `/catalog` | 상품 관리 | 폼·미리보기 가능. 실서버 persist 503 |
| 그 외 catch-all | 없는 화면 | 오늘 할 일로 바꾸지 않음 |
