export const COPY = {
  brand: "퍼뜩 관리",
  loginTitle: "퍼뜩 관리에 로그인",
  loginHelp: "운영 업무를 시작하려면 운영자 계정으로 들어와 주세요.",
  loginUnimplemented:
    "옛 문서 경로 POST /api/v1/admin-auth/login 은 없습니다. 현재 계약 경로는 POST /api/v1/admin-session/login 이며 활성화는 BLOCKED 입니다.",
  loginStoreUnready:
    "비밀번호 로그인 경로는 있으나 직원 자격 저장소가 아직 준비되지 않았습니다. 503 · 적용 안 함이며 완료가 아닙니다.",
  loginWaiting: "운영자 서버 주소가 없어 연결을 기다립니다.",
  isolatedHint: "이 컴퓨터 안에서만 쓰는 시험 화면입니다. 실제 회원은 건드리지 않아요.",
  isolatedAccounts: "시험 계정: qa-super, qa-cs, qa-marketing",
  sessionExpired: "운영자 로그인이 끝났어요. 다시 들어와 주세요.",
  denied: "이 작업 권한이 없어요. 서버가 거절했습니다.",
  notFound: "이 회원 번호는 찾을 수 없어요. 다른 회원으로 바꾸지 않았어요.",
  storeUnready: "저장소가 아직 준비되지 않아 적용하지 않았어요.",
  conflict: "다른 직원이 먼저 바꿔서 저장하지 않았어요. 다시 불러와 주세요.",
  unknown: "결과를 확인할 수 없어요. 추측 숫자로 채우지 않았어요.",
  userMismatch: "응답 회원 번호가 요청과 달라 화면에 넣지 않았어요.",
  busy: "이미 처리 중이에요. 같은 요청을 다시 보내지 않았어요.",
  draftBanner: "이 화면은 초안입니다. 실제 운영 데이터와 연결되어 있지 않아요.",
  noFakeComplete: "서버가 확인한 실제 효과가 없어 완료로 표시하지 않았어요.",
  missingRoute: "없는 화면입니다. 상품 목록으로 바꾸지 않았어요.",
  catalogListEmpty: "등록된 상품이 없습니다.",
  catalogListUnavailable: "상품 목록을 확인할 수 없습니다. 추측 목록으로 채우지 않았어요.",
  catalogListLoading: "상품 목록을 불러오는 중…",
  usersSearchHelp:
    "지금 지원하는 것은 정확한 회원 번호(UUID) 한 건 조회입니다. 페이지 목록은 없고, 빈 검색은 목록 성공이 아닙니다.",
  usersNoFallback: "없는 회원은 다른 회원으로 바꾸지 않아요.",
  capHelp: "하루 기본 기회만 바꿉니다. 최소 이익·엄격함·자본은 건드리지 않아요.",
  bonusHelp: "추가 기회는 0회 차단이나 이용 정지를 풀어 주지 않아요.",
  gradeHelp: "신규 기본은 하루 5회입니다. 이미 8회로 적힌 회원은 그대로 둡니다.",
  pinHelp: "수동 등급 유지를 켜면 자동으로 등급이 내려가지 않아요. 자동 하향 규칙은 꺼져 있어요.",
  displayHelp: "화면 진행 시간만 바꿉니다. 참여·정산·돈·횟수·등급은 그대로입니다.",
  displayInFlight: "이미 시작된 안내는 시작 당시 시간을 유지하고, 새 설정은 다음 안내부터 적용돼요.",
  previewOnly: "미리보기는 참여나 정산을 만들지 않아요.",
  meMembershipForbidden: "회원 본인 조회는 관리자 목록으로 쓰지 않아요.",
  catalogS2:
    "전체 공개가 기본입니다. 선택 회원 공개는 권한이지 독점 예약이 아닙니다. 같은 상품에 여러 회원이 동시에 참여할 수 있어요.",
  catalogPersistUnready: "실서버 상품 저장소는 아직 준비되지 않아 저장하지 않아요. 미리보기·검증은 할 수 있어요.",
  catalogMemoHint:
    "가격 확인 메모(priceConfirmationMemo)는 코어 persist 필드입니다. 시스템 가격 검증 완료가 아닙니다. 실 Postgres 컬럼은 아직 없어 저장소 미준비면 적용하지 않아요.",
  catalogConcurrent: "한 회원의 참여가 다른 회원의 같은 상품 참여를 독점으로 잠그지 않아야 합니다.",
  catalogPayoutHint:
    "설정 지급액(configuredPayoutUsdt)입니다. 예상액·설정액·화면 계산값을 원장 실지급으로 쓰지 않아요.",
  catalogResellerHidden:
    "리셀러 ID는 서버가 준 resellerId만 표시합니다. 추천 코드·계정 이름·데모 번호로 채우지 않아요. 실DB 조회 검증은 아직 없습니다.",
  resellerUnissued:
    "리셀러 ID 미발급. 서버가 resellerId를 주지 않았어요. 계정 이름·추천 코드로 채우지 않았어요.",
  catalogNoGet:
    "상품 단건 조회 Admin API는 없습니다. 목록 응답과 방금 저장한 상품 번호로만 수정·공개·참여 조회를 요청합니다.",
  catalogSnapshot:
    "기존 참여는 당시 snapshot을 유지합니다. 지금 설정액·공개 범위로 바꾸지 않아요. 저널 없는 금액은 실지급이 아닙니다.",
  catalogIdempotency:
    "상품 등록에는 서버 멱등키가 없습니다. 결과가 불명확하면 새로 등록한 것으로 보지 말고, 같은 내용으로 다시 확인만 하세요. 추가 기회 지급은 같은 요청 키로 다시 보냅니다.",
  moneyNotPaid: "지급 완료 아님. 원장 저널과 실지급액이 함께 있을 때만 완료입니다.",
  financeDryRun: "입출금·원장 쓰기는 아직 시험 범위라 실제 돈을 바꾸지 않아요.",
} as const;
