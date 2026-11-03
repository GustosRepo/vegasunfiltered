import { test, expect, type Page } from "./browser-test";

const adScript = "**/pagead2.googlesyndication.com/pagead/js/adsbygoogle.js*";

async function mockAdSense(page: Page, status = "filled") {
  let libraryRequests = 0;
  await page.route(adScript, async (route) => {
    libraryRequests += 1;
    await route.fulfill({ contentType: "application/javascript", body: `
      window.__testAdRequests = 0;
      window.adsbygoogle = { push() {
        const ad = document.querySelector('ins.adsbygoogle:not([data-adsbygoogle-status])');
        if (!ad) throw new Error('Ad was initialized more than once');
        ad.setAttribute('data-adsbygoogle-status', 'done');
        ad.setAttribute('data-ad-status', ${JSON.stringify(status)});
        ad.style.minHeight = '220px';
        ad.textContent = 'Mock advertisement';
        window.__testAdRequests += 1;
      } };
    ` });
  });
  return () => libraryRequests;
}

async function adRequests(page: Page) {
  return page.evaluate(() => (window as Window & { __testAdRequests?: number }).__testAdRequests ?? 0);
}

test("homepage display ad follows the reviews and shares its library with article ads", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const libraries = await mockAdSense(page);
  await page.goto("/e2e-review-fixture/ads-homepage");
  const ad = page.locator('ins.adsbygoogle:visible');
  await expect(ad).toHaveCount(1);
  await expect(ad).toHaveAttribute("data-ad-client", "ca-pub-8863066373093222");
  await expect(ad).toHaveAttribute("data-ad-slot", "8538710734");
  await expect(ad).toHaveAttribute("data-ad-format", "auto");
  await expect(ad).toHaveAttribute("data-full-width-responsive", "true");
  await expect(ad).not.toHaveAttribute("data-ad-layout", "in-article");
  await expect(ad).toHaveAttribute("data-adsbygoogle-status", "done");
  const wrapper = page.locator(".homepage-ad");
  expect(await wrapper.evaluate((element) => element.previousElementSibling?.classList.contains("latest-section"))).toBe(true);
  expect(await wrapper.evaluate((element) => element.nextElementSibling?.classList.contains("eat-section"))).toBe(true);
  expect((await wrapper.locator(".ad-slot").boundingBox())!.height).toBeGreaterThanOrEqual(280);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByRole("link", { name: "Open test review", exact: true }).click();
  await expect(page).toHaveURL(/\/ads$/);
  await expect(page.locator('ins.adsbygoogle:visible')).toHaveAttribute("data-ad-slot", "5213709246");
  await expect.poll(() => adRequests(page)).toBe(2);
  await expect(page.locator('script[src*="adsbygoogle.js"]')).toHaveCount(1);
  expect(libraries()).toBe(1);
  await page.goBack();
  await expect(page).toHaveURL(/\/ads-homepage$/);
  await expect(page.locator('ins.adsbygoogle:visible')).toHaveAttribute("data-ad-slot", "8538710734");
  expect(await adRequests(page)).toBe(2);
  expect(libraries()).toBe(1);
  expect(errors).toEqual([]);
});

test("review uses the supplied ad once after the experience and reuses its script on navigation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const libraries = await mockAdSense(page);
  await page.goto("/e2e-review-fixture/ads");
  const ad = page.locator('ins.adsbygoogle');
  await expect(ad).toHaveCount(1);
  await expect(ad).toHaveAttribute("data-ad-client", "ca-pub-8863066373093222");
  await expect(ad).toHaveAttribute("data-ad-slot", "5213709246");
  await expect(ad).toHaveAttribute("data-ad-layout", "in-article");
  await expect(ad).toHaveAttribute("data-ad-format", "fluid");
  await expect(ad).toHaveAttribute("data-adsbygoogle-status", "done");
  await expect.poll(() => adRequests(page)).toBe(1);
  const placement = page.getByRole("complementary", { name: "Advertisement", exact: true });
  await expect(placement).toContainText("ADVERTISEMENTS");
  expect(await placement.evaluate((element) => element.previousElementSibling?.id)).toBe("our-experience");
  expect(await placement.evaluate((element) => element.nextElementSibling?.id)).toBe("what-we-tried");
  expect((await placement.boundingBox())!.height).toBeGreaterThanOrEqual(280);
  expect((await ad.boundingBox())!.width).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByRole("link", { name: "Next test review", exact: true }).click();
  await expect(page).toHaveURL(/\/ads-next$/);
  await expect.poll(() => adRequests(page)).toBe(2);
  await expect(page.locator('ins.adsbygoogle:visible')).toHaveCount(1);
  await expect(page.locator('script[src*="adsbygoogle.js"]')).toHaveCount(1);
  expect(libraries()).toBe(1);
  await page.getByRole("link", { name: "Previous test review", exact: true }).click();
  // Cache Components retains the previous page and its filled unit in Activity.
  // Returning to that page must not request another ad for the same DOM node.
  await expect(page).toHaveURL(/\/ads$/);
  await expect(page.locator('ins.adsbygoogle:visible')).toHaveCount(1);
  await expect(page.locator('ins.adsbygoogle:visible')).toHaveAttribute("data-adsbygoogle-status", "done");
  expect(await adRequests(page)).toBe(2);
  expect(libraries()).toBe(1);
  expect(errors).toEqual([]);
});

test("previews, unindexed, short and empty reviews never load ad code", async ({ page }) => {
  const libraries = await mockAdSense(page);
  for (const path of ["ads-preview", "ads-noindex", "ads-short", "ads-empty"]) {
    await page.goto(`/e2e-review-fixture/${path}`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('ins.adsbygoogle, script[src*="adsbygoogle.js"], .ad-slot')).toHaveCount(0);
  }
  expect(libraries()).toBe(0);
});

test("navigation before the library loads initializes only the current visible review", async ({ page }) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  const libraries = await mockAdSense(page);
  // Route handlers run in reverse order: hold this request, then use the mock.
  await page.route(adScript, async (route) => { await held; await route.fallback(); });
  await page.goto("/e2e-review-fixture/ads", { waitUntil: "domcontentloaded" });
  await expect(page.locator('script[src*="adsbygoogle.js"]')).toHaveCount(1);
  await page.getByRole("link", { name: "Next test review", exact: true }).click();
  await expect(page).toHaveURL(/\/ads-next$/);
  release();
  await expect(page.locator('ins.adsbygoogle:visible')).toHaveAttribute("data-adsbygoogle-status", "done");
  expect(await adRequests(page)).toBe(1);
  expect(libraries()).toBe(1);
});

test("blocked advertising scripts leave the review readable without an empty ad block", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(adScript, (route) => route.abort("blockedbyclient"));
  await page.goto("/e2e-review-fixture/ads");
  await expect(page.locator(".ad-slot")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "What we tried", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("an unfilled ad collapses its label and reserved space", async ({ page }) => {
  await mockAdSense(page, "unfilled");
  await page.goto("/e2e-review-fixture/ads");
  await expect(page.locator('ins.adsbygoogle')).toHaveAttribute("data-ad-status", "unfilled");
  await expect(page.locator(".ad-slot")).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "What we tried", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
