import { test, expect } from "@playwright/test";

for (const path of ["/", "/restaurants", "/activities", "/about", "/editorial-policy", "/privacy", "/affiliate-disclosure", "/contact"]) {
  test(`public page ${path} renders without runtime errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".cms-sidebar")).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https:\/\/vegasunfiltered\.com/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

for (const path of ["/restaurants/cheap-eats-las-vegas", "/restaurants/las-vegas-happy-hours", "/activities/chinatown-las-vegas", "/activities/las-vegas-on-a-budget", "/activities/friday-night-in-chinatown"]) {
  test(`demo story ${path} renders and remains noindex`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
}

test("public navigation and mobile menu work", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) await page.locator("header summary").click();
  await page.locator("header").getByRole("link", { name: "Restaurants", exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/restaurants$/);
});

test("legacy sections and stories redirect to their review URLs", async ({ page }) => {
  for (const [oldPath, newPath] of [
    ["/eat", "/restaurants"], ["/drink", "/restaurants"], ["/explore", "/activities"],
    ["/save", "/activities"], ["/stories", "/activities"],
    ["/eat/cheap-eats-las-vegas", "/restaurants/cheap-eats-las-vegas"],
    ["/stories/friday-night-in-chinatown", "/activities/friday-night-in-chinatown"],
  ]) {
    await page.goto(oldPath);
    await expect(page).toHaveURL(new RegExp(`${newPath}$`));
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://vegasunfiltered.com${newPath}`);
  }
});

test("sitemap and robots expose discovery without admin URLs", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain("<urlset");
  expect(xml).not.toContain("/admin");
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("sitemap.xml");
});

test("unknown public story renders not-found UI and cannot be indexed", async ({ page }) => {
  const response = await page.goto("/restaurants/e2e-nonexistent-story");
  // Next.js streams notFound() responses with 200 after headers have been sent.
  expect([200, 404]).toContain(response?.status());
  await expect(page.getByRole("heading", { name: /could not be found|404/i }).first()).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toHaveAttribute("content", /noindex/);
});

test("cron rejects missing, malformed, and invalid credentials", async ({ request }) => {
  for (const authorization of ["", "Bearer invalid", "invalid"]) {
    const response = await request.get("/api/cron/publish-scheduled", { headers: { authorization } });
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized." });
  }
});

test("login is styled, private, and has no public site chrome", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByLabel("Work email")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator(".cms-login-form")).toHaveCSS("display", "grid");
  await expect(page.locator(".cms-login-card")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator("header, footer, .cms-sidebar")).toHaveCount(0);
});

for (const path of ["/admin", "/admin/reviews", "/admin/reviews/new", "/admin/visits", "/admin/team"]) {
  test(`signed-out access to ${path} is protected`, async ({ page }) => {
    await page.goto(path);
    if (process.env.E2E_PUBLIC_ONLY === "1") {
      await expect(page.getByRole("heading", { name: "Connect the publishing desk." })).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/admin\/login$/);
      await expect(page.getByLabel("Work email")).toBeVisible();
    }
    await expect(page.locator(".cms-sidebar")).toHaveCount(0);
  });
}
