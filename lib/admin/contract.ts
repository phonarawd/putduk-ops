/** 확인된 백엔드 계약만. URL을 추측해 만들지 않는다. */

/** OPS 쪽 표시·기회 묶음. 매니페스트 버전과 문자열만 맞춰 쓰지 않는다. */
export const CONTRACT_VERSION = "2026-09-14.b3.display-v19" as const;

/**
 * 2026-09-15 02:23+09 다시 읽은 백엔드 매니페스트.
 * fingerprint·버전 문자열을 맞추려고 조작하지 않았다.
 * git HEAD와 매니페스트에 적힌 head가 다르면 둘 다 기록한다.
 */
export const BACKEND_MANIFEST_READ = {
  readAt: "2026-09-15T02:23:38+09:00",
  recheckAt: "2026-09-15T02:26:37+09:00",
  file: "C:\\Users\\PC\\Desktop\\AI_PROFIT_OS\\quality\\contracts\\operator-control\\manifest.json",
  fileSha256: "71a5d90f34c937b553e801ba5b907eefb29e71129586c315de0b1fd3c17fd510",
  contractVersion: "2026-09-15.mall-persist-v3",
  rereadNote:
    "02:23:09 git HEAD는 31c8e73. 매니페스트 내장 head는 여전히 ec436d4. 해시·버전을 맞추지 않음. 02:23:38 해시 후·02:26:37 재확인에서 operator-control 파일 해시와 HEAD가 같았고 해당 경로는 porcelain 비어 있음. 다른 백엔드 경로는 dirty.",
  repo: "phonarawd/AI-Profit-OS",
  branch: "feat/operator-registered-catalog-s1",
  gitHead: "31c8e7310032444e7bb3abe879d40cafc22b8bbe",
  manifestEmbeddedHead: "ec436d4d32937f2778b4b764e89918de2ca70280",
  head: "31c8e7310032444e7bb3abe879d40cafc22b8bbe",
  dirty: true,
  dirtyNote: "operator-control 계약 파일은 이번 읽기에서 porcelain 비어 있음. 다른 백엔드 경로는 dirty.",
  operatorControlPorcelain: "clean",
  implementation: "local_dirty_not_deployed",
  schemaApplied: false,
  storeReady: false,
  publishedToUiRepo: false,
  moneyAuthority: {
    expectedProfitUsdt: "예상액",
    configuredPayoutUsdt: "설정 지급액",
    ledgerPaidUsdt: "원장 실지급",
    ledgerJournalId: "원장 저널",
    payoutAuthoritative: "저널+실지급이 있을 때만 true",
  },
  operatorMemoPersist: false,
  priceConfirmationMemo: {
    coreField: true,
    livePostgresColumn: false,
    nestStore: "STORE_UNREADY",
  },
  resellerIdLiveHttp: true,
  resellerIdLivePostgresVerified: false,
  productListGetExists: false,
  productGetByIdExists: false,
  productRevisionConflictInCore: false,
  backendEnvCatalogTest: "CATALOG_TEST_DATABASE_URL",
  countActiveTradesForOpportunityUserId: {
    sourceConfirmed: true,
    contractUserIdFilterApplied: true,
    realPostgresConcurrency: "BLOCKED",
  },
  files: {
    adminSessionLogin: {
      file: "admin-session-login.v1.json",
      sha256: "4bf15344300536d6967c596c9673abd7cdc723f8d1d189e542c6ce716737827c",
      activation: "BLOCKED",
    },
    adminMemberDirectory: {
      file: "admin-member-directory.v1.json",
      sha256: "0a5d43ea4074cd9655ee1688a241591264dc34169064433704718e93d868d249",
      paginatedList: "BLOCKED",
      exactUuidLookup: "implemented_reuses_getMembership",
    },
    productVisibility: {
      file: "product-visibility-concurrent-participate.v1.json",
      sha256: "89714a195816b5d5a9303c2f3c9f5ade05d726f206ea50c6981b79a7c3d9bf1f",
      persist: "STORE_UNREADY",
    },
    persistStatus: {
      file: "persist-status.v1.json",
      sha256: "ebc9caede7a2eddc3fb49817cd70c45a871b1ecf4135cfe5d5a0df27310cdd3d",
      schemaApplied: false,
      contractVersion: "2026-09-15.persist-status-v2",
    },
    features130: {
      file: "features-130.json",
      sha256: "4da385e305f9c93fc3363f050346cdc09edac26095dc92bcf46b562fcbb75e89",
    },
  },
} as const;

export const CONTRACT_FINGERPRINTS = {
  userBundle: "16c9b46268c0a89af2f02e0fd11e55fdefe3edb3740e152499daa76f683f7b52",
  displayVsExecution: "9bfa6f968fe03059dc05b1d733eaee74baf85b7199a1fd74c649c8c009e054a8",
  presentationJourney: "24954d962dfe2daf89643184600e13b5c8a3aa67fb0553d21e55dfb4d35dee29",
  userMeExample: "06a8e9f9f86354996bac298bf34bda1834042b6f2bcab8cfb45fd1f039c19bc7",
  features130: "4da385e305f9c93fc3363f050346cdc09edac26095dc92bcf46b562fcbb75e89",
  preservedB3: "1691f25517dc1a8cc1ca2f9481eb581ea9d1dfdfc670423648db49e3c1f851de",
  adminSessionLogin: "4bf15344300536d6967c596c9673abd7cdc723f8d1d189e542c6ce716737827c",
  adminMemberDirectory: "0a5d43ea4074cd9655ee1688a241591264dc34169064433704718e93d868d249",
  productVisibility: "89714a195816b5d5a9303c2f3c9f5ade05d726f206ea50c6981b79a7c3d9bf1f",
  persistStatus: "ebc9caede7a2eddc3fb49817cd70c45a871b1ecf4135cfe5d5a0df27310cdd3d",
} as const;

export const CONTRACT_SOURCE = {
  repo: "phonarawd/AI-Profit-OS",
  branch: "feat/operator-registered-catalog-s1",
  head: BACKEND_MANIFEST_READ.gitHead,
  manifestEmbeddedHead: BACKEND_MANIFEST_READ.manifestEmbeddedHead,
  implementation: "local_dirty_not_deployed",
  schemaApplied: false,
  storeReady: false,
  publishedToUiRepo: false,
  userMeMembershipIsSelfOnly: true,
  manifestVersionRead: BACKEND_MANIFEST_READ.contractVersion,
} as const;

/** persist-status.v2 실측. 실컬럼·실DB 검증과 코어 배선을 섞지 않는다. */
export const OPERATOR_MEMO_PERSIST = false;
export const PRICE_CONFIRMATION_MEMO_CORE = true;
export const PRICE_CONFIRMATION_MEMO_LIVE_COLUMN = false;
export const RESELLER_ID_LIVE_HTTP = true;
export const RESELLER_ID_LIVE_POSTGRES_VERIFIED = false;
/** Admin 상품 목록 GET은 operator-products 동일 path. 단건 GET은 operator-products/:id. */
export const PRODUCT_LIST_GET_EXISTS = true;
export const PRODUCT_GET_BY_ID_EXISTS = true;
/** mall core update는 revision을 올리지만 expectedRevision 409는 아직 없음. 화면은 409를 처리할 준비만 한다. */
export const PRODUCT_REVISION_CONFLICT_IN_CORE = false;
/** 백엔드 persist 계약에 있는 격리 DB 이름. 값이 있다고 연결하지 않는다. */
export const BACKEND_ENV_CATALOG_TEST = "CATALOG_TEST_DATABASE_URL";

export const API_PREFIX = "/api/v1" as const;

/** 옛 문서 path. 현재 워크스페이스 컨트롤러가 없다. */
export const LEGACY_DOCUMENTED_PATHS = {
  adminAuthLogin: "POST /api/v1/admin-auth/login",
  adminAuthMfa: "POST /api/v1/admin-auth/mfa",
  adminUsersGet: "GET /api/v1/admin/users/:id",
  adminUsersPiiReveal: "POST /api/v1/admin/users/:id/pii-reveal",
} as const;

/**
 * 하위 호환 이름.
 * adminUsersList 문자열은 경로 안내일 뿐, 페이지 목록 활성화를 뜻하지 않는다.
 */
export const DOCUMENTED_UNIMPLEMENTED = {
  adminAuthLogin: LEGACY_DOCUMENTED_PATHS.adminAuthLogin,
  adminAuthMfa: LEGACY_DOCUMENTED_PATHS.adminAuthMfa,
  adminUsersList: "GET /api/v1/admin/users",
  adminUsersGet: LEGACY_DOCUMENTED_PATHS.adminUsersGet,
  adminUsersPiiReveal: LEGACY_DOCUMENTED_PATHS.adminUsersPiiReveal,
} as const;

/** 현재 계약 path. 활성화와 별개다. */
export const CURRENT_CONTRACT_PATHS = {
  adminSessionLogin: "POST /api/v1/admin-session/login",
  adminUsersUuidLookup: "GET /api/v1/admin/users?q=",
  operatorProductsList: "GET /api/v1/admin/opportunities/operator-products",
  operatorProducts: "POST /api/v1/admin/opportunities/operator-products",
  operatorProductGet: "GET /api/v1/admin/opportunities/operator-products/:id",
  operatorProductById: "PATCH /api/v1/admin/opportunities/:id/operator-product",
  operatorVisibility: "PATCH /api/v1/admin/opportunities/:id/visibility",
  operatorParticipations: "GET /api/v1/admin/opportunities/:id/participations",
} as const;

export const CONTRACT_ACTIVATION = {
  adminSessionLogin: "BLOCKED",
  adminUsersPaginatedList: "live",
  mallPersist: "BLOCKED",
} as const;

/** 컨트롤러·가드·CSRF까지 확인된 경로 */
export const ADMIN_SESSION_ROUTES = {
  status: "/admin-session",
  exchange: "/admin-session",
  login: "/admin-session/login",
  logout: "/admin-session/logout",
} as const;

export const CMS_KINDS = ["notice", "event", "benefit", "banner", "notification"] as const;
export type CmsKind = (typeof CMS_KINDS)[number];

export const CMS_KIND_LABEL_KO: Record<CmsKind, string> = {
  notice: "공지사항",
  event: "이벤트",
  benefit: "혜택",
  banner: "배너",
  notification: "알림",
};

export const CMS_ADMIN_ROUTES = {
  list: (kind: string) => `/admin/cms/${kind}`,
  create: (kind: string) => `/admin/cms/${kind}`,
  get: (kind: string, id: string) => `/admin/cms/${kind}/${id}`,
  patch: (kind: string, id: string) => `/admin/cms/${kind}/${id}`,
  publish: (kind: string, id: string) => `/admin/cms/${kind}/${id}/publish`,
  end: (kind: string, id: string) => `/admin/cms/${kind}/${id}/end`,
} as const;

export const WALLET_ADMIN_ROUTES = {
  depositConfig: "/admin/wallet/deposit-config",
  krwDepositRequests: "/admin/wallet/krw-deposit-requests",
  krwDepositApprove: (id: string) => `/admin/wallet/krw-deposits/${id}/approve`,
  krwDepositReject: (id: string) => `/admin/wallet/krw-deposits/${id}/reject`,
  userDepositAddress: (id: string) => `/admin/users/${id}/deposit-address`,
  withdrawReviewList: "/admin/wallet/withdraw-intents",
  withdrawReviewApprove: (id: string) => `/admin/wallet/withdraw-intents/${id}/approve`,
  withdrawReviewReject: (id: string) => `/admin/wallet/withdraw-intents/${id}/reject`,
} as const;

export const COMPLIANCE_ADMIN_ROUTES = {
  kycQueue: "/admin/compliance/kyc",
  kycApprove: (userId: string) => `/admin/compliance/kyc/${userId}/approve`,
  kycReject: (userId: string) => `/admin/compliance/kyc/${userId}/reject`,
} as const;

export const MEMBERSHIP_ADMIN_ROUTES = {
  directory: "/admin/users",
  profile: (id: string) => `/admin/users/${id}`,
  membership: (id: string) => `/admin/users/${id}/membership`,
  matchPolicyOverride: (id: string) => `/admin/users/${id}/match-policy-override`,
  dailyMatchCap: (id: string) => `/admin/users/${id}/membership/daily-match-cap`,
  effectivePreview: (id: string) => `/admin/users/${id}/membership/effective-preview`,
  bonusGrants: (id: string) => `/admin/users/${id}/membership/bonus-grants`,
  bonusReclaim: (id: string) => `/admin/users/${id}/membership/bonus-grants/reclaim`,
  quotaProjection: (id: string) => `/admin/users/${id}/membership/quota-projection`,
  gradeDailyCaps: "/admin/membership/grade-daily-caps",
  presentationProfile: "/admin/membership/presentation-profile",
} as const;

export const MALL_ADMIN_ROUTES = {
  register: "/admin/opportunities/operator-products",
  get: (id: string) => `/admin/opportunities/operator-products/${id}`,
  update: (id: string) => `/admin/opportunities/${id}/operator-product`,
  visibility: (id: string) => `/admin/opportunities/${id}/visibility`,
  participations: (id: string) => `/admin/opportunities/${id}/participations`,
} as const;

export const ADMIN_SESSION_COOKIE_NAME = "aipo_admin_session";
export const ADMIN_CSRF_COOKIE_NAME = "aipo_admin_csrf";
export const ADMIN_CSRF_HEADER = "x-admin-csrf";
export const USER_SESSION_COOKIE_NAME = "aipo_session";

export const ADMIN_JWT_ISSUER = "ai-profit-os-admin";
export const ADMIN_JWT_AUDIENCE = "aipo-ops";
export const USER_JWT_ISSUER = "ai-profit-os-nest";
export const USER_JWT_AUDIENCE = "peotteok-user";

export const MEMBERSHIP_IDS = ["sprout", "entry", "core", "high", "vip"] as const;
export type MembershipId = (typeof MEMBERSHIP_IDS)[number];

export const MEMBERSHIP_LABEL_KO: Record<MembershipId, string> = {
  sprout: "새싹",
  entry: "입문",
  core: "본격",
  high: "고액",
  vip: "VIP",
};

/** 신규 가입 기본. 기존 관측 사다리 8과 다름. 전원 덮어쓰기 금지 */
export const NEW_SIGNUP_DAILY_MATCH_CAP = 5;
export const OBSERVED_LADDER_SPROUT = 8;

export const GRADE_DAILY_MATCH_DEFAULTS: Record<MembershipId, number> = {
  sprout: NEW_SIGNUP_DAILY_MATCH_CAP,
  entry: 6,
  core: 5,
  high: 3,
  vip: 2,
};

export const OBSERVED_LADDER_CAPS: Record<MembershipId, number> = {
  sprout: 8,
  entry: 6,
  core: 5,
  high: 3,
  vip: 2,
};

export const JOURNEY_V19_STEPS = [
  "product",
  "compare",
  "cargo",
  "flight",
  "buyer",
  "settle",
  "complete",
] as const;
export type JourneyV19Step = (typeof JOURNEY_V19_STEPS)[number];

export const JOURNEY_V19_LABEL_KO: Record<JourneyV19Step, string> = {
  product: "상품 확인",
  compare: "구매·판매 조건 확인",
  cargo: "연결 준비",
  flight: "과정 안내",
  buyer: "조건 연결",
  settle: "금액 확인",
  complete: "안내 마무리",
};

export const JOURNEY_V19_DEFAULT_AT_SEC: Record<JourneyV19Step, number> = {
  product: 0,
  compare: 8,
  cargo: 18,
  flight: 28,
  buyer: 48,
  settle: 58,
  complete: 66,
};

export const JOURNEY_V19_DEFAULT_TOTAL_SEC = 70;
export const AT_SEC_MIN = 0;
export const AT_SEC_MAX = 600;
export const TOTAL_SEC_MIN = 1;
export const TOTAL_SEC_MAX = 600;

export const DISPLAY_KIND = "user_display_journey" as const;
export const EXECUTION_POLICY_KIND = "execution_policy_day1" as const;

export const FIVE_STEP_DRAFT = [
  "product_check",
  "price_compare",
  "matching",
  "settle_prep",
  "credit",
] as const;

export const REASON_MIN_LENGTH = 10;

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ADMIN_ROLES = ["super", "finance", "cs", "risk", "marketing"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_ROLE_LABEL_KO: Record<AdminRole, string> = {
  super: "최고관리자",
  finance: "재무",
  cs: "고객지원",
  risk: "리스크",
  marketing: "마케팅",
};

export type CapabilityLevel = "none" | "read" | "write";

/** 화면 안내용. 서버 거절이 최종이다. */
export const ROLE_CAPABILITY: Record<
  AdminRole,
  { userMatchPolicy: CapabilityLevel; userMembershipForce: CapabilityLevel }
> = {
  super: { userMatchPolicy: "write", userMembershipForce: "write" },
  finance: { userMatchPolicy: "write", userMembershipForce: "write" },
  cs: { userMatchPolicy: "read", userMembershipForce: "none" },
  risk: { userMatchPolicy: "none", userMembershipForce: "none" },
  marketing: { userMatchPolicy: "none", userMembershipForce: "none" },
};

export const DOCUMENTED_PRODUCTION_API_HOST = "https://api.hiptk.app";

export const PRODUCT_VISIBILITY = ["all_public", "selected_members", "private"] as const;
export type ProductVisibility = (typeof PRODUCT_VISIBILITY)[number];

export const PRODUCT_CURRENCY = "USDT" as const;

export function isMembershipId(value: string): value is MembershipId {
  return (MEMBERSHIP_IDS as readonly string[]).includes(value);
}

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(value);
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function sameUserId(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function isProductVisibility(value: string): value is ProductVisibility {
  return (PRODUCT_VISIBILITY as readonly string[]).includes(value);
}

export function roleAllows(
  role: string,
  capability: "userMatchPolicy" | "userMembershipForce",
  level: CapabilityLevel,
): boolean {
  if (!isAdminRole(role)) return false;
  if (role === "super") return true;
  const have = ROLE_CAPABILITY[role][capability];
  const rank = { none: 0, read: 1, write: 2 };
  return rank[have] >= rank[level];
}
