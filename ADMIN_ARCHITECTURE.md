# Admin Architecture

`Admin UI → domain action → data adapter → Demo adapter(현재) 또는 Nest API adapter(이식 후)`

Frontend는 Supabase에 직접 접근하지 않는다. 회원 상태, 잔액, 거래 결과, 본인 확인과 권한의 최종 권위는 기존 Backend다.

핵심 Domain은 Work, Users, AI Conversations, Support, Money, Identity, Content, Safety, Reports, Staff, Activity, Service다. 위험 작업은 대상 확인 → 영향 확인 → 이유 → 재확인 → 결과 → 작업 기록 순서다. 개인정보·AI 대화·본인 확인 자료는 별도의 열람 기록을 남긴다.
