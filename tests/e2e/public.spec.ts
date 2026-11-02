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
  test(`removed demo story ${path} is not publicly available`, async ({ page }) => {
    const response = await page.goto(path);
    expect([200, 404]).toContain(response?.status());
    await expect(page.getByRole("heading", { name: /could not be found|404/i }).first()).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toHaveAttribute("content", /noindex/);
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
  ]) {
    await page.goto(oldPath);
    await expect(page).toHaveURL(new RegExp(`${newPath}$`));
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://vegasunfiltered.com${newPath}`);
  }
});

test("empty publication shows no sample cards or review links", async ({ page }) => {
  test.skip(process.env.E2E_PUBLIC_ONLY !== "1", "Requires the isolated empty publication.");
  await page.goto("/");
  await expect(page.getByText("Our first reviews are on the way.", { exact: false })).toBeVisible();
  await expect(page.locator('a[href*="cheap-eats-las-vegas"], a[href*="chinatown"], a[href*="las-vegas-happy-hours"], a[href*="las-vegas-on-a-budget"]')).toHaveCount(0);
  for (const path of ["/restaurants", "/activities"]) {
    await page.goto(path);
    await expect(page.getByText("No reviews published yet.", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: /Cheap Eats|Happy Hours|Chinatown|Budget/ })).toHaveCount(0);
    await expect(page.getByText(/DEMO SECTION/)).toHaveCount(0);
    await expect(page.getByRole("searchbox")).toHaveCount(0);
  }
});

test("sitemap and robots expose discovery without admin URLs", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain("<urlset");
  expect(xml).not.toContain("/admin");
  for (const slug of ["cheap-eats-las-vegas", "las-vegas-happy-hours", "chinatown-las-vegas", "las-vegas-on-a-budget", "friday-night-in-chinatown"]) {
    expect(xml).not.toContain(slug);
  }
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("sitemap.xml");
});

test("SEO metadata uses canonical URLs, descriptive titles, and a PNG social image", async ({ page, request }) => {
  for (const [path, title] of [
    ["/", "Honest Las Vegas Restaurant & Activity Reviews | Vegas Unfiltered"],
    ["/about", "About Vegas Unfiltered | Honest Reviews, Real-Life Budgets"],
    ["/restaurants", "Las Vegas Restaurant Reviews | Vegas Unfiltered"],
    ["/activities", "Las Vegas Activity Reviews | Vegas Unfiltered"],
  ]) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Las Vegas/);
    const canonical = `https://vegasunfiltered.com${path === "/" ? "" : path}`;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonical);
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /https:\/\/vegasunfiltered\.com\/opengraph-image/);
    await expect(page.locator('meta[name="twitter:image"]').first()).toHaveAttribute("content", /https:\/\/vegasunfiltered\.com\/opengraph-image/);
  }
  const image = await request.get("/opengraph-image");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
  const png = await image.body();
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
  expect(png.length).toBeLessThan(5 * 1024 * 1024);
});

test("About page reflects the owner's perspective without invented identity claims", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "About me." })).toBeVisible();
  await expect(page.getByText("I'm a dad and a husband", { exact: false })).toBeVisible();
  await expect(page.getByText("Especially in this economy", { exact: false })).toBeVisible();
  await expect(page.locator('nav[aria-label="Explore Vegas Unfiltered"] a')).toHaveCount(4);
  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const about = schemas.map((value) => JSON.parse(value)).find((value) => value["@type"] === "AboutPage");
  expect(about).toMatchObject({
    "@id": "https://vegasunfiltered.com/about#webpage",
    url: "https://vegasunfiltered.com/about",
    isPartOf: { "@id": "https://vegasunfiltered.com/#website" },
  });
  expect(about.breadcrumb.itemListElement).toHaveLength(2);
  expect(about).not.toHaveProperty("sameAs");
  await expect(page.getByRole("link", { name: "How I review", exact: true })).toHaveAttribute("href", "/editorial-policy");
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
