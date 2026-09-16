import { connectionWaiting } from "./errors.ts";
import { createLiveAdapter } from "./live-adapter.ts";
import { resolveOrigin } from "./origin.ts";
import { createIsolatedStore, type IsolatedStore } from "./qa/isolated-store.ts";
import type { AdminOpsPort, AdminSession } from "./types.ts";

let isolated: IsolatedStore | null = null;

export function isolatedStore(): IsolatedStore {
  isolated ??= createIsolatedStore();
  return isolated;
}

export function resetIsolatedStore(): IsolatedStore {
  isolated = createIsolatedStore();
  return isolated;
}

function waitingAdapter(): AdminOpsPort {
  const wait = async () => connectionWaiting();
  return {
    async session() {
      return { ok: true, status: 200, data: { connected: false, mode: "waiting" } };
    },
    isolatedLogin: wait,
    login: wait,
    logout: wait,
    lookupUser: wait,
    getMembership: wait,
    putDailyMatchCap: wait,
    forceMembership: wait,
    listBonus: wait,
    grantBonus: wait,
    reclaimBonus: wait,
    quotaProjection: wait,
    listGradeDailyCaps: wait,
    putGradeDailyCap: wait,
    listPresentation: wait,
    putPresentation: wait,
    previewProduct: wait,
    listProducts: wait,
    getProduct: wait,
    registerProduct: wait,
    updateProduct: wait,
    updateProductVisibility: wait,
    listParticipations: wait,
  };
}

function isolatedAdapter(store: IsolatedStore): AdminOpsPort {
  if (typeof window !== "undefined") {
    const raw = Number(new URLSearchParams(window.location.search).get("writeDelay") || 0);
    if (Number.isFinite(raw) && raw > 0) store.setWriteDelay(raw);
  }
  return {
    async session() {
      return { ok: true, status: 200, data: store.getSession() };
    },
    async isolatedLogin(username) {
      return store.login(username);
    },
    async login() {
      return {
        ok: false as const,
        status: 401,
        code: "ADMIN_AUTH_LOGIN_UNIMPLEMENTED" as const,
        message: "격리 시험은 시험 계정 이름만 씁니다. 운영 비밀번호를 흉내 내지 않아요.",
        applied: false as const,
      };
    },
    async logout() {
      return store.logout();
    },
    async lookupUser(userId) {
      return store.lookupUser(userId);
    },
    async getMembership(userId) {
      return store.getMembership(userId);
    },
    async putDailyMatchCap(userId, body) {
      await store.waitIfDelayed();
      return store.putDailyMatchCap(userId, body);
    },
    async forceMembership(userId, body) {
      await store.waitIfDelayed();
      return store.forceMembership(userId, body);
    },
    async listBonus(userId) {
      return store.listBonus(userId);
    },
    async grantBonus(userId, body) {
      await store.waitIfDelayed();
      return store.grantBonus(userId, body);
    },
    async reclaimBonus(userId, body) {
      await store.waitIfDelayed();
      return store.reclaimBonus(userId, body);
    },
    async quotaProjection(userId) {
      return store.quotaProjection(userId);
    },
    async listGradeDailyCaps() {
      return store.listGradeDailyCaps();
    },
    async putGradeDailyCap(body) {
      return store.putGradeDailyCap(body);
    },
    async listPresentation() {
      return store.listPresentation();
    },
    async putPresentation(body) {
      await store.waitIfDelayed();
      return store.putPresentation(body);
    },
    async previewProduct(draft) {
      return store.previewProduct(draft);
    },
    async listProducts() {
      return store.listProducts();
    },
    async getProduct(id) {
      return store.getProduct(id);
    },
    async registerProduct(draft) {
      await store.waitIfDelayed();
      return store.registerProduct(draft);
    },
    async updateProduct(id, draft) {
      await store.waitIfDelayed();
      return store.updateProduct(id, draft);
    },
    async updateProductVisibility(id, body) {
      await store.waitIfDelayed();
      return store.updateProductVisibility(id, body);
    },
    async listParticipations(id) {
      return store.listParticipations(id);
    },
    setStoreReady(ready) {
      store.setStoreReady(ready);
    },
    setWriteDelay(ms) {
      store.setWriteDelay(ms);
    },
    bumpProductRevision(id) {
      return store.bumpProductRevision(id);
    },
  };
}

export function createAdminAdapter(): AdminOpsPort {
  const origin = resolveOrigin();
  if (origin.mode === "isolated-qa") return isolatedAdapter(isolatedStore());
  if (origin.mode === "live") return createLiveAdapter();
  return waitingAdapter();
}

export function sessionLabel(session: AdminSession): { name: string; role: string } {
  if (!session.connected) return { name: "연결 안 됨", role: "대기" };
  return {
    name: session.displayName ?? "운영자",
    role: session.role ?? "확인 중",
  };
}
