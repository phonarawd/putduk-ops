# Cursor 인계 — PUTDUK OPS

이 소스는 GPT가 제작한 퍼뜩 Admin Frontend Prototype이다. 레포 이름은 `phonarawd/putduk-ops`이고 로컬 폴더 이름은 `PUTDUK_ADMIN`으로 사용한다. Cursor AI는 이 화면을 기존 PUTDUK Nest API에 연결해 실제 운영 화면으로 완성한다.

작업 순서는 반드시 다음과 같다.

1. `README.md`, `ADMIN_SCREEN_MAP.md`, `ADMIN_INTEGRATION_MAP.md`, `ADMIN_BACKEND_GAP_REGISTER.md`를 읽는다.
2. 기존 백엔드 `AI_PROFIT_OS`의 실제 controller, DTO, guard, 권한, 응답을 확인한다.
3. 실제로 존재하는 API만 adapter에 연결한다.
4. API가 없는 화면은 가짜 성공·가짜 숫자·가짜 완료 상태를 만들지 않고 `준비 중` 또는 `확인할 수 없음` 상태로 둔다.
5. 연결 후 운영자 로그인부터 모든 메뉴와 버튼을 브라우저에서 점검한다.

문서상 운영 API 안내는 `https://api.hiptk.app`이다. 환경 값이 없으면 주소를 추측해 연결하지 않는다.
관리자 쿠키는 `aipo_admin_session`이다. 사용자 쿠키 `aipo_session`은 관리자 인증이 아니다.

## 유지
- `app/admin-app.tsx`: 화면과 Demo 흐름
- `app/admin.css`: 퍼뜩 Admin 디자인
- `app/[...path]/page.tsx`: 전체 화면 주소

## 교체
- `/login`의 체험용 로그인 처리(현재 입력값 확인 후 `/`로 이동)
- 파일 내부 Demo 회원·거래·대화·공지 데이터
- 화면 안에서만 변하는 승인 상태

## 사용자에게 보이는 문구

- 운영자 화면도 초등학생이 이해할 수 있는 쉬운 한국어를 사용한다.
- `API`, `payload`, `endpoint`, `server error` 같은 개발자 표현을 메뉴와 안내문에 쓰지 않는다.
- 토스트는 한글 친화 문장과 상황에 맞는 이모티콘을 사용한다.
- 실제 데이터가 없는 숫자와 상태를 정상·완료로 표시하지 않는다.

## 금지
- Frontend의 Supabase 직접 접근
- 새 인증 체계 발명
- Endpoint나 응답 형태 추측
- 실제 금액을 Frontend에서 권위 값으로 계산

현재 Nest controller·DTO·guard를 확인하고 읽기 API부터 adapter에 연결한다. Demo 표식은 실제 연결이 끝난 화면에서만 제거한다.

## 절대 금지

- `PUTDUK_WEB` 수정
- 백엔드 재작성
- Supabase 직접 연결
- 프론트에서 금액·잔액·수익 계산을 최종 값으로 사용
- API 계약 추측
- 운영 DB에 직접 SQL 실행
- 비밀키와 실제 비밀번호 커밋
- 승인 없이 commit, push, merge, deploy

## 로그인 이식 기준
- 기존 PUTDUK 운영자 인증·세션·권한 가드를 그대로 연결한다.
- 미인증 상태에서 모든 관리자 주소를 `/login`으로 보내고, 로그인 후 원래 요청 주소로 복귀시킨다.
- 전체 책임자·상담·본인 확인 등 역할별 메뉴 노출과 서버 권한 검사를 함께 적용한다.
- 실제 운영 환경에서는 2FA, 로그인 실패 제한, 세션 만료, 강제 로그아웃, 로그인 감사 기록을 Backend 정책과 연결한다.
