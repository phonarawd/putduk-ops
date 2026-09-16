import type { AdminRole, MembershipId, ProductVisibility } from "./contract.ts";
import type { AdminResult } from "./errors.ts";
import type { MoneyAuthority } from "./money-authority.ts";
import type { PresentationListing, PresentationProfile } from "./presentation.ts";
import type { OperatorProduct, OperatorProductDraft } from "./product.ts";

export type GradeControl = "MANUAL_PIN" | "AUTO";

export type DailyMatchQuota = {
  userId: string;
  cap: number;
  used: number;
  remaining: number;
  source: string;
  blocked: boolean;
  usedCountBasis: "accepted_participate_requests_kst_day";
  timezone?: "Asia/Seoul";
  kstDay?: string;
  baseRemaining?: number;
  bonusRemaining?: number;
  participateRemaining?: number;
  explicitParticipateBlock?: boolean;
  storeStatus?: "ready" | "unready";
  schemaReady?: boolean;
  persistence?: string;
  providerKind?: string;
  bonusSource?: string;
  gradeCapSource?: string;
};

export type UserMembership = {
  userId: string;
  membership: MembershipId;
  maxCapitalBand: string;
  dailyUserMatchCap: number;
  matchStrictness: string;
  adminForce?: boolean;
  dailyMatchesUsed: number;
  fulfillRate7d?: number | null;
  updatedAt?: string;
};

export type MembershipSnapshot = {
  membership: UserMembership;
  labelKo: string;
  quota: DailyMatchQuota;
  gradeControl: GradeControl;
  autoDowngrade: false;
  fulfillRateReadOnly: true;
  ledgerMutated: false;
  resellerId?: string | null;
};

export type BonusGrant = {
  grantId: string;
  userId: string;
  amount: number;
  used: number;
  reclaimed: number;
  status: string;
  reason: string;
  updatedByAdminId: string;
  idempotencyKey: string;
  at?: string;
  expiresAt: null;
  expiryPolicy: "unspecified_not_activated";
  carryOver: false;
};

export type BonusList = {
  userId: string;
  grants: BonusGrant[];
  remaining: {
    granted: number;
    used: number;
    reclaimed: number;
    remaining: number;
    grants: BonusGrant[];
  };
  persistence: string;
  schemaReady: boolean;
  storeStatus: "ready" | "unready";
};

export type GradeDailyCaps = {
  revision: number;
  caps: Record<MembershipId, number>;
  compiledDefaults: Record<MembershipId, number>;
  existingMemberBackfill: false;
  storeStatus: "ready" | "unready";
  schemaReady: boolean;
  persistence?: string;
};

export type WriteMeta = {
  applied: boolean;
  storeStatus: "ready" | "unready";
  schemaReady: boolean;
  persistence?: string;
  replay?: boolean;
  ledgerMutated: false;
  auditAction?: string;
  revision?: number;
};

export type AdminSession = {
  connected: boolean;
  adminId?: string;
  role?: string;
  displayName?: string;
  mode: "isolated-qa" | "live" | "waiting";
};

export type ConfirmDraft = {
  title: string;
  targetLabel: string;
  currentLabel: string;
  nextLabel: string;
  impact: string;
  reason: string;
  approval?: string;
};

export type DirectoryLookup = {
  userId: string;
  membership: MembershipId;
  exact: true;
  substituted: false;
  resellerId?: string | null;
};

export type ProductWriteResult = {
  product: OperatorProduct;
} & WriteMeta;

export type ProductListResult = {
  items: OperatorProduct[];
  nextCursor?: string;
  storeStatus?: "ready" | "unready";
};

export type ProductUpdateDraft = Partial<OperatorProductDraft> & {
  expectedRevision?: number;
};

export type ParticipationRow = {
  id: string;
  userId: string;
  productId: string;
  snapshot?: { payoutAmount?: string; visibility?: string; productRevision?: number };
  moneyAuthority?: MoneyAuthority;
  payoutStatus?: string;
};

export type { MoneyAuthority };

export type AdminOpsPort = {
  session(): Promise<AdminResult<AdminSession>>;
  isolatedLogin(username: string): Promise<AdminResult<AdminSession>>;
  login(email: string, password: string): Promise<AdminResult<AdminSession>>;
  logout(): Promise<AdminResult<{ connected: false }>>;
  lookupUser(userId: string): Promise<AdminResult<DirectoryLookup>>;
  getMembership(userId: string): Promise<AdminResult<MembershipSnapshot>>;
  putDailyMatchCap(
    userId: string,
    body: { dailyUserMatchCap?: number; clear?: boolean; reason: string },
  ): Promise<AdminResult<MembershipSnapshot & WriteMeta>>;
  forceMembership(
    userId: string,
    body: { membership?: MembershipId; clearForce?: boolean; reason: string },
  ): Promise<AdminResult<{ membership: UserMembership } & WriteMeta>>;
  listBonus(userId: string): Promise<AdminResult<BonusList>>;
  grantBonus(
    userId: string,
    body: { amount: number; reason: string; idempotencyKey: string },
  ): Promise<AdminResult<{ grant: BonusGrant } & WriteMeta>>;
  reclaimBonus(
    userId: string,
    body: { amount?: number; reason: string },
  ): Promise<AdminResult<{ reclaimed: number; remaining: number } & WriteMeta>>;
  quotaProjection(userId: string): Promise<AdminResult<{ quota: DailyMatchQuota; gradeControl: GradeControl }>>;
  listGradeDailyCaps(): Promise<AdminResult<GradeDailyCaps>>;
  putGradeDailyCap(
    body: { grade: MembershipId; dailyUserMatchCap: number; reason: string; expectedRevision?: number },
  ): Promise<AdminResult<GradeDailyCaps & WriteMeta>>;
  listPresentation(): Promise<AdminResult<PresentationListing>>;
  putPresentation(
    body: { profile: PresentationProfile; reason: string; expectedRevision?: number },
  ): Promise<AdminResult<PresentationListing & WriteMeta>>;
  previewProduct(draft: OperatorProductDraft): Promise<AdminResult<{ persist: OperatorProductDraft }>>;
  listProducts(): Promise<AdminResult<ProductListResult>>;
  getProduct(id: string): Promise<AdminResult<OperatorProduct>>;
  registerProduct(draft: OperatorProductDraft): Promise<AdminResult<ProductWriteResult>>;
  updateProduct(id: string, draft: ProductUpdateDraft): Promise<AdminResult<ProductWriteResult>>;
  updateProductVisibility(
    id: string,
    body: { visibility: ProductVisibility; selectedMemberIds?: string[]; expectedRevision?: number },
  ): Promise<AdminResult<ProductWriteResult>>;
  listParticipations(id: string): Promise<AdminResult<{ items: ParticipationRow[]; storeStatus: "ready" | "unready" }>>;
  setStoreReady?(ready: boolean): void;
  setWriteDelay?(ms: number): void;
  bumpProductRevision?(id: string): boolean;
};

export type { AdminRole, MembershipId };
