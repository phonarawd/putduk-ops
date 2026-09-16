import { expect, test, type Page } from "@playwright/test";
import { assertNoProdHost, isDeniedUrl } from "./allowlist.mjs";
import { QA_RESELLER_IDS, QA_USERS } from "../../lib/admin/qa/isolated-store.ts";

const qaPort = process.env.PUTDUK_OPS_QA_PORT || "4177";

async function guardEgress(page: Page) {
  await page.route("**/*", async (route) => {
    const raw = route.request().url();
    const url = new URL(raw);
    try {
      assertNoProdHost(url);
    } catch {
      await route.abort();
      return;
    }
    if (isDeniedUrl(url, qaPort)) {
      await route.abort();
      return;
    }
    await route.continue();
  });
}

async function loginIsolated(page: Page, next = "/") {
  await page.goto(`/login?isolatedQa=1&next=${encodeURIComponent(next)}`);
  await expect(page.getByTestId("login-form")).toBeVisible();
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("page-title")).toBeVisible({ timeout: 20_000 });
}

async function openCatalogForm(page: Page) {
  await expect(page.getByTestId("catalog-list")).toBeVisible();
  await page.getByTestId("catalog-register").click();
  await expect(page.getByTestId("catalog-name")).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test.describe("isolated-qa screens @mock", () => {
  test.beforeEach(async ({ page }) => {
    await guardEgress(page);
  });

  test("로그인 제목은 어절이 붙지 않고 아이디 칸에 박스가 있다", async ({ page }) => {
    await page.goto("/login?isolatedQa=1");
    await expect(page.locator(".login-card h2")).toHaveText("퍼뜩 관리에 로그인");
    const id = page.getByTestId("login-id");
    await expect(id).toHaveAttribute("type", "text");
    await expect(id).toHaveAttribute("placeholder", "qa-super");
    const box = await id.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    const border = await id.evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(Number.parseFloat(border)).toBeGreaterThan(0);
  });

  test("로그인 격리 시험은 계정 이름으로만 들어간다", async ({ page }) => {
    await loginIsolated(page, "/");
    await expect(page.getByTestId("header-health")).toContainText("격리 시험 중");
    await expect(page.getByTestId("page-title")).toHaveText("상품 목록");
    await expect(page.getByTestId("catalog-list")).toBeVisible();
    await expect(page.getByTestId("catalog-list-empty")).toBeVisible();
  });

  test("없는 화면은 상품 목록으로 바꾸지 않는다", async ({ page }) => {
    await loginIsolated(page, "/no-such-page");
    await expect(page.getByTestId("page-title")).toHaveText("없는 화면");
    await expect(page.getByTestId("missing-route")).toContainText("없는 화면");
    await expect(page.getByTestId("dashboard-draft-tasks")).toHaveCount(0);
    await expect(page.getByTestId("catalog-list")).toHaveCount(0);
  });

  test("상품 목록에 가짜 티켓이 없다", async ({ page }) => {
    await loginIsolated(page, "/");
    await expect(page.getByTestId("catalog-list")).toBeVisible();
    await expect(page.getByTestId("dashboard-draft-tasks")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("W-24001");
    await expect(page.locator("body")).not.toContainText("W-24091");
    await expect(page.locator("body")).not.toContainText("A-08871");
    await expect(page.locator("body")).not.toContainText("AI-8821");
  });

  test("회원 목록 표가 있다", async ({ page }) => {
    await loginIsolated(page, "/users");
    await expect(page.getByTestId("page-title")).toHaveText("회원 목록");
    await expect(page.getByTestId("member-table")).toBeVisible();
    await expect(page.getByTestId("users-q")).toBeVisible();
    await expect(page.getByTestId("users-lookup")).toBeVisible();
  });

  test("입금 안내에 가짜 계좌가 없다", async ({ page }) => {
    await loginIsolated(page, "/money/deposit-guide");
    await expect(page.getByTestId("deposit-guide")).toBeVisible();
    await expect(page.getByTestId("deposit-account-number")).toHaveValue("");
    await expect(page.getByTestId("deposit-bank-name")).toHaveValue("");
  });

  test("아직 안 쓰는 메뉴는 접혀 있다", async ({ page }) => {
    await loginIsolated(page, "/");
    await expect(page.getByTestId("fold-toggle")).toBeVisible();
    await expect(page.getByRole("link", { name: "문의함" })).toHaveCount(0);
    await page.getByTestId("fold-toggle").click();
    await expect(page.getByRole("link", { name: "문의함" })).toBeVisible();
  });

  test("CMS 초안을 게시하고 종료한다", async ({ page }) => {
    await loginIsolated(page, "/content/notices");
    await expect(page.getByTestId("cms-screen")).toBeVisible();
    await page.getByTestId("cms-title").fill("격리 시험 공지입니다");
    await page.getByTestId("cms-body").fill("본문");
    await page.getByTestId("cms-create").click();
    await expect(page.getByTestId("cms-table")).toBeVisible();
    await page.locator("[data-testid^='cms-publish-']").first().click();
    await expect(page.getByTestId("admin-toast")).toHaveAttribute("data-ok", "true");
    await page.locator("[data-testid^='cms-end-']").first().click();
    await expect(page.getByTestId("admin-toast")).toHaveAttribute("data-ok", "true");
  });

  test("UUID 조회 404는 다른 회원으로 바꾸지 않는다", async ({ page }) => {
    await loginIsolated(page, "/users");
    await page.getByTestId("users-q").fill(QA_USERS.missing);
    await page.getByTestId("users-lookup").click();
    await expect(page.locator("body")).toContainText("찾을 수 없어요");
    await expect(page.getByTestId("member-user-id")).toHaveCount(0);
  });

  test("정확한 UUID는 그 회원만 연다", async ({ page }) => {
    await loginIsolated(page, "/users");
    await page.getByTestId("users-q").fill(QA_USERS.explicit8);
    await page.getByTestId("users-lookup").click();
    await expect(page.getByTestId("member-user-id")).toContainText(QA_USERS.explicit8);
  });

  test("저장 실패 토스트는 성공 체크가 아니다", async ({ page }) => {
    await loginIsolated(page, `/users/${QA_USERS.explicit8}`);
    await expect(page.getByTestId("member-user-id")).toContainText(QA_USERS.explicit8);
    await page.getByTestId("ops-reason").fill("격리 화면 저장 실패 확인용 사유입니다");
    await page.getByTestId("cap-save").click();
    await page.getByTestId("confirm-ok").click();
    const toast = page.getByTestId("admin-toast");
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute("data-ok", "false");
    await expect(toast).toContainText("준비되지 않아");
  });

  test("기회 변경은 저장소 준비 전에는 적용하지 않는다", async ({ page }) => {
    await loginIsolated(page, `/users/${QA_USERS.explicit8}`);
    await page.getByTestId("ops-reason").fill("격리 화면 기회 변경 확인용 사유입니다");
    await page.getByTestId("cap-save").click();
    await page.getByTestId("confirm-ok").click();
    await expect(page.getByTestId("admin-toast")).toHaveAttribute("data-ok", "false");
    await expect(page.getByTestId("member-user-id")).toContainText(QA_USERS.explicit8);
  });

  test("회원 전환 중 늦은 쓰기는 다른 화면에 붙지 않는다", async ({ page }) => {
    await loginIsolated(page, `/users/${QA_USERS.explicit8}?writeDelay=1500`);
    await expect(page.getByTestId("member-user-id")).toContainText(QA_USERS.explicit8);
    await page.getByTestId("ops-reason").fill("격리 화면 회원 전환 레이스 확인 사유입니다");
    await page.getByTestId("cap-save").click();
    await page.getByTestId("confirm-ok").click();
    await page.evaluate((href) => {
      window.history.pushState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, `/users/${QA_USERS.cap0}`);
    await expect(page.getByTestId("member-user-id")).toContainText(QA_USERS.cap0);
    await page.waitForTimeout(1800);
    await expect(page.getByTestId("member-user-id")).toContainText(QA_USERS.cap0);
    await expect(page.getByTestId("member-user-id")).not.toContainText(QA_USERS.explicit8);
  });

  test("상품 폼은 미리보기 가능하고 실서버 저장은 막힌다", async ({ page }) => {
    await loginIsolated(page, "/catalog");
    await expect(page.getByTestId("page-title")).toHaveText("상품 목록");
    await openCatalogForm(page);
    await page.getByTestId("catalog-name").fill("격리 시험 공용 상품");
    await page.getByTestId("catalog-qty").fill("2");
    await page.getByTestId("catalog-payout").fill("12.5");
    await page.getByTestId("catalog-capital").fill("80");
    await page.getByTestId("catalog-preview").click();
    await expect(page.getByTestId("catalog-preview-body")).toContainText("모든 회원에게 공개");
    await expect(page.getByTestId("catalog-preview-body")).toContainText("정산 USDT: 12.5");
    await expect(page.getByTestId("catalog-preview-body")).toContainText("필요자본 USDT: 80");
    await expect(page.getByTestId("catalog-preview-body")).toContainText("표시 원: 없음");
    await expect(page.getByTestId("catalog-preview-body")).toContainText("설정 지급액: 12.5");
    await expect(page.getByTestId("catalog-preview-body")).toContainText("지급 완료 아님");
    await expect(page.getByTestId("catalog-preview-body")).toHaveAttribute("data-payout-complete", "false");
    await page.getByTestId("catalog-save").click();
    await page.getByTestId("confirm-ok").click();
    await expect(page.getByTestId("admin-toast")).toHaveAttribute("data-ok", "false");
  });

  test("선택 공개는 독점 예약이 아니고 메모는 시스템 검증이 아니다", async ({ page }) => {
    await loginIsolated(page, "/catalog");
    await openCatalogForm(page);
    await page.getByTestId("catalog-name").fill("격리 선택 공개 상품");
    await page.getByTestId("catalog-qty").fill("1");
    await page.getByTestId("catalog-payout").fill("3.5");
    await page.getByTestId("catalog-capital").fill("40");
    await page.getByTestId("catalog-visibility").selectOption("selected_members");
    await page.getByTestId("catalog-members").fill(QA_USERS.explicit8);
    await page.getByTestId("catalog-memo").fill("가격 근거 메모는 persist가 아님");
    await page.getByTestId("catalog-preview").click();
    const preview = page.getByTestId("catalog-preview-body");
    await expect(preview).toContainText("선택한 회원에게만 공개");
    await expect(preview).toContainText("여러 회원이 같이 참여할 수 있어요");
    await expect(preview).toContainText("운영 메모");
    await expect(preview).toContainText("이 메모는 가격이 맞다는 확인이 아닙니다");
    await expect(preview).toContainText("지급 완료 아님");
    await expect(preview).toHaveAttribute("data-payout-complete", "false");
  });

  test("모바일에서 상품 입력칸이 뷰포트 안에 남는다", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginIsolated(page, "/catalog");
    await openCatalogForm(page);
    const box = await page.getByTestId("catalog-name").boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390 + 1);
    expect(box.width).toBeGreaterThan(120);
    const health = page.getByTestId("header-health");
    await expect(health).toBeVisible();
    const hbox = await health.boundingBox();
    expect(hbox).not.toBeNull();
    if (!hbox) return;
    expect(hbox.x + hbox.width).toBeLessThanOrEqual(390 + 8);
  });

  test("서버 리셀러 ID 또는 명확한 미발급만 보여 준다", async ({ page }) => {
    await loginIsolated(page, `/users/${QA_USERS.explicit8}`);
    const issued = page.getByTestId("member-reseller-id");
    await expect(issued).toHaveAttribute("data-issued", "true");
    await expect(issued).toContainText(QA_RESELLER_IDS.explicit8);
    await expect(page.locator("body")).not.toContainText("PD-10284");
    await page.evaluate((href) => {
      window.history.pushState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, `/users/${QA_USERS.cap0}`);
    await expect(page.getByTestId("member-user-id")).toContainText(QA_USERS.cap0);
    const unissued = page.getByTestId("member-reseller-id");
    await expect(unissued).toHaveAttribute("data-issued", "false");
    await expect(unissued).toContainText("미발급");
  });

  test("준비된 격리 저장소에서 상품 수정 409는 완료가 아니다", async ({ page }) => {
    await loginIsolated(page, "/catalog");
    await page.getByTestId("qa-store-ready").click();
    await openCatalogForm(page);
    await page.getByTestId("catalog-name").fill("격리 준비 상품");
    await page.getByTestId("catalog-qty").fill("2");
    await page.getByTestId("catalog-payout").fill("12.5");
    await page.getByTestId("catalog-capital").fill("80");
    await page.getByTestId("catalog-memo").fill("확인: 12.5 USDT");
    await page.getByTestId("catalog-save").click();
    await page.getByTestId("confirm-ok").click();
    await expect(page.getByTestId("admin-toast")).toHaveAttribute("data-ok", "true");
    await expect(page.getByTestId("catalog-last-id")).toContainText("저장 번호 1");
    await expect(page.getByTestId("catalog-preview-body")).toContainText("운영 메모");
    await page.getByTestId("catalog-stale-revision").click();
    await page.getByTestId("catalog-update").click();
    await page.getByTestId("confirm-ok").click();
    await expect(page.getByTestId("ops-result-banner")).toHaveAttribute("data-code", "REVISION_CONFLICT");
    await expect(page.getByTestId("admin-toast")).toHaveAttribute("data-ok", "false");
  });

  test("없는 상품 참여 조회는 다른 상품으로 바꾸지 않는다", async ({ page }) => {
    await loginIsolated(page, "/catalog");
    await page.getByTestId("qa-store-ready").click();
    await openCatalogForm(page);
    await page.getByTestId("catalog-known-id").fill("55555555-5555-4555-8555-555555555555");
    await page.getByTestId("catalog-participations").click();
    await expect(page.getByTestId("ops-result-banner")).toBeVisible();
    await expect(page.getByTestId("catalog-participation-list")).toHaveCount(0);
  });

  test("로그아웃하면 회원 화면을 열지 않는다", async ({ page }) => {
    await loginIsolated(page, "/users");
    await page.getByTestId("logout").click();
    await expect(page.getByTestId("login-form")).toBeVisible();
    await page.goto(`/users/${QA_USERS.explicit8}?isolatedQa=1`);
    await expect(page.getByTestId("login-form")).toBeVisible();
    await expect(page.getByTestId("member-user-id")).toHaveCount(0);
  });

  test("중복 확인 클릭은 처리 중이면 다시 보내지 않는다", async ({ page }) => {
    await loginIsolated(page, "/catalog?writeDelay=1500");
    await openCatalogForm(page);
    await page.getByTestId("catalog-name").fill("중복 클릭 상품");
    await page.getByTestId("catalog-qty").fill("1");
    await page.getByTestId("catalog-payout").fill("2.5");
    await page.getByTestId("catalog-capital").fill("20");
    await page.getByTestId("catalog-save").click();
    const ok = page.getByTestId("confirm-ok");
    await ok.click();
    await expect(ok).toBeDisabled();
    await expect(page.getByTestId("confirm-cancel")).toBeDisabled();
    await expect(page.getByTestId("admin-toast")).toHaveAttribute("data-ok", "false", { timeout: 10_000 });
  });

  test("짧은 화면에서도 저장 버튼과 오류 안내가 보인다", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await loginIsolated(page, "/catalog");
    await openCatalogForm(page);
    const save = page.getByTestId("catalog-save");
    await expect(save).toBeVisible();
    const box = await save.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320 + 8);
    await page.getByTestId("catalog-name").fill("짧은 화면 상품");
    await page.getByTestId("catalog-qty").fill("1");
    await page.getByTestId("catalog-payout").fill("1.5");
    await page.getByTestId("catalog-capital").fill("10");
    await save.click();
    const confirm = page.getByTestId("confirm-ok");
    await confirm.scrollIntoViewIfNeeded();
    await expect(confirm).toBeVisible();
    await confirm.click();
    await expect(page.getByTestId("ops-result-banner")).toBeVisible();
    const toast = page.getByTestId("admin-toast");
    await expect(toast).toHaveAttribute("data-ok", "false");
    const toastBox = await toast.boundingBox();
    expect(toastBox).not.toBeNull();
    if (!toastBox) return;
    expect(toastBox.y).toBeGreaterThanOrEqual(0);
    expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(568 + 8);
    await page.getByTestId("ops-result-banner").scrollIntoViewIfNeeded();
    const banner = await page.getByTestId("ops-result-banner").boundingBox();
    expect(banner).not.toBeNull();
    if (!banner) return;
    expect(banner.y).toBeGreaterThanOrEqual(0);
    expect(banner.y).toBeLessThan(568);
  });
});

test.describe("waiting login @mock", () => {
  test.beforeEach(async ({ page }) => {
    await guardEgress(page);
  });

  test("원본 주소가 없으면 연결 대기로 두고 제출하지 않는다", async ({ page }) => {
    test.skip(process.env.PUTDUK_OPS_PW_LIVE === "1", "live 서버에서는 waiting이 아님");
    await page.goto("/login");
    await expect(page.getByTestId("login-waiting")).toContainText("연결을 기다립니다");
    await expect(page.getByTestId("login-submit")).toBeDisabled();
  });
});

test.describe("live unready @mock", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(process.env.PUTDUK_OPS_PW_LIVE !== "1", "같은 주소 mock API가 있을 때만");
    await guardEgress(page);
  });

  test("라이브 로그인 이메일 칸은 박스가 있고 제목에 공백이 있다 @live-unready", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator(".login-card h2")).toHaveText("퍼뜩 관리에 로그인");
    const id = page.getByTestId("login-id");
    await expect(id).toHaveAttribute("type", "email");
    await expect(id).toHaveAttribute("placeholder", "이메일을 입력하세요");
    const box = await id.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    const border = await id.evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(Number.parseFloat(border)).toBeGreaterThan(0);
  });

  test("비밀번호 제출은 경로가 있어도 503을 완료로 열지 않는다 @live-unready", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("login-live-hint")).toContainText("운영자 이메일");
    await page.getByTestId("login-id").fill("ops@example.com");
    await page.getByTestId("login-password").fill("not-a-production-password");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-error")).toContainText("준비되지 않았습니다");
    await expect(page.getByTestId("page-title")).toHaveCount(0);
  });

  test("로그인 네트워크 실패는 완료로 열지 않는다 @live-unready", async ({ page }) => {
    await page.route("**/api/v1/admin-session/login", (route) => route.abort());
    await page.goto("/login");
    await page.getByTestId("login-id").fill("ops@example.com");
    await page.getByTestId("login-password").fill("not-a-production-password");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-error")).toBeVisible();
    await expect(page.getByTestId("page-title")).toHaveCount(0);
  });
});
