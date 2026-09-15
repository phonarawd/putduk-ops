# Admin Integration Map

실제 Endpoint와 DTO는 현재 Nest source에서 확인한다. 아래는 URL이 아니라 의도 이름이다.

| 화면 | Adapter 의도 |
|---|---|
| 운영자 로그인 | `POST /api/v1/admin-session/login` · `GET /api/v1/admin-session` · `POST /api/v1/admin-session/logout` |
| 운영 상품 | `GET/POST /api/v1/admin/opportunities/operator-products` · `PATCH .../operator-product` · `PATCH .../visibility` · `GET .../participations` |
| 회원 | `fetchAdminUsers`, `fetchAdminUser`, `revealAdminUserPii` |
| AI 대화 | `fetchAiConversations`, `fetchAiConversation`, `markAiConversationReviewed`, `fetchAiConversationAccessHistory` |
| 출금 | `fetchWithdrawRequests`, `approveWithdrawRequest`, `rejectWithdrawRequest` |
| 콘텐츠 | `requestContentApproval`, `scheduleContent`, `pauseEvent` |
| 안전 | `fetchSafetyAlerts`, `createSafetyCase`, `assignSafetyCase` |
| 직원·서비스 | `updateStaffPermissions`, `fetchApprovalRequests`, `fetchServiceStatus`, `requestEmergencyControl` |

변경 action은 권한, 중복 실행 방지, 변경 전후 기록과 실패 복구를 Backend 계약에서 함께 검증한다.
