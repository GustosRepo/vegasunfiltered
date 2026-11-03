import { test, expect } from "./browser-test";

test("SEO preview follows the review type, metadata fallbacks and social image selection", async ({ page }) => {
  await page.goto("/e2e-review-fixture/editor");
  // A missing headline keeps this fixture from sending any database writes.
  await page.getByLabel("URL slug", { exact: true }).fill("our-evening");
  await page.getByLabel("Subtitle / dek", { exact: true }).fill("What our evening actually cost.");
  await page.getByRole("combobox", { name: "Featured image", exact: true }).selectOption("123e4567-e89b-42d3-a456-426614174000");
  await page.getByRole("tab", { name: "SEO", exact: true }).click();
  const preview = page.getByLabel("Search result preview");
  await expect(preview).toContainText("https://vegasunfiltered.com/restaurants/our-evening");
  await expect(preview).toContainText("What our evening actually cost.");
  await expect(page.locator(".cms-social-preview img")).toHaveAttribute("alt", "Our dinner");
  await page.getByLabel("SEO title", { exact: true }).fill("Our honest evening review");
  await page.getByLabel("Meta description", { exact: true }).fill("Our firsthand take on the experience.");
  await page.getByLabel("Primary keyword", { exact: true }).fill("Las Vegas evening");
  await page.getByLabel("Secondary keywords (comma-separated)", { exact: true }).fill("date night, Las Vegas");
  await page.getByLabel("Internal linking notes", { exact: true }).fill("Link our other date night review.");
  await page.getByLabel("Social sharing image", { exact: true }).selectOption("123e4567-e89b-42d3-a456-426614174001");
  await expect(page.locator(".cms-social-preview img")).toHaveAttribute("alt", "The dining room");
  await expect(preview).toContainText("Our honest evening review");
  await expect(preview).toContainText("Our firsthand take on the experience.");
  await page.getByRole("tab", { name: "Content", exact: true }).click();
  await page.getByRole("combobox", { name: "Review type", exact: true }).selectOption("activity");
  await page.getByRole("tab", { name: "SEO", exact: true }).click();
  await expect(preview).toContainText("https://vegasunfiltered.com/activities/our-evening");
  await expect(page.getByLabel("Primary keyword", { exact: true })).toHaveValue("Las Vegas evening");
  await expect(page.getByLabel(/Canonical URL/)).toHaveCount(0);
  await page.getByRole("tab", { name: "Content", exact: true }).click();
  await page.getByLabel("URL slug", { exact: true }).fill("another-evening");
  await page.getByRole("tab", { name: "SEO", exact: true }).click();
  await expect(preview).toContainText("https://vegasunfiltered.com/activities/another-evening");
  await page.getByLabel(/Allow search engines/).check();
  await expect(page.getByText(/Once published, this review can appear/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("canonical, social URL and article schema agree on the current review URL despite a stale override", async ({ page }) => {
  await page.goto("/e2e-review-fixture/canonical");
  const expected = "https://vegasunfiltered.com/restaurants/test-only-review";
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", expected);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", expected);
  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const article = schemas.map((value) => JSON.parse(value)).find((value) => value["@type"] === "BlogPosting");
  expect(article.mainEntityOfPage).toBe(expected);
  expect(article["@id"]).toBe(`${expected}#article`);
});

test("existing reviews show an automatic URL without exposing or using their saved overrides", async ({ page }) => {
  await page.goto("/e2e-review-fixture/editor-published");
  await page.getByRole("tab", { name: "SEO", exact: true }).click();
  await expect(page.getByLabel(/Canonical URL/)).toHaveCount(0);
  await expect(page.getByLabel("Search result preview")).toContainText("https://vegasunfiltered.com/restaurants/test-only-review");
  await expect(page.getByLabel("Search result preview")).not.toContainText("example.com");
});

test("save and publishing validation opens the tab containing the invalid field", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", request => { if (request.headers()["next-action"]) writes.push(request.url()); });
  await page.goto("/e2e-review-fixture/editor");
  await page.getByRole("tab", { name: "Publishing", exact: true }).click();
  await page.getByRole("button", { name: "Submit for review", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Content", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Headline", { exact: true })).toBeFocused();
  await page.getByLabel("Headline", { exact: true }).fill("Our evening review");
  await page.getByRole("tab", { name: "SEO", exact: true }).click();
  const seoTitle = page.getByLabel("SEO title", { exact: true });
  // Exercise server/form validation beyond the browser's length guard.
  await seoTitle.evaluate((element) => element.removeAttribute("maxlength"));
  await seoTitle.fill("x".repeat(71));
  await page.getByRole("tab", { name: "Content", exact: true }).click();
  await page.getByLabel("URL slug", { exact: true }).fill("our-evening");
  await page.getByRole("tab", { name: "Publishing", exact: true }).click();
  await page.getByRole("button", { name: "Submit for review", exact: true }).click();
  await expect(page.getByRole("tab", { name: "SEO", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("SEO title", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator(".cms-form-error")).toContainText("70");
  expect(writes).toEqual([]);
});

test("review tabs support keyboard navigation", async ({ page }) => {
  await page.goto("/e2e-review-fixture/editor");
  await page.getByRole("tab", { name: "Content", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Photos", exact: true })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toHaveAccessibleName("Photos");
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Publishing", exact: true })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Content", exact: true })).toBeFocused();
});

test("publishing controls match live, scheduled, archived and approved review states", async ({ page }) => {
  await page.goto("/e2e-review-fixture/editor-published");
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeVisible();
  await expect(page.getByText("Saving changes updates the live review immediately.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Unpublish", exact: true })).toBeVisible();
  await page.goto("/e2e-review-fixture/editor-scheduled");
  await expect(page.getByRole("button", { name: "Archive", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish now", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel schedule and return to draft", exact: true })).toBeVisible();
  await page.goto("/e2e-review-fixture/editor-archived");
  await expect(page.getByRole("button", { name: "Return to draft", exact: true })).toBeVisible();
  await page.goto("/e2e-review-fixture/editor-approved");
  await expect(page.getByRole("button", { name: "Publish now", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Schedule", exact: true })).toBeDisabled();
  await expect(page.getByText(/Automatic publishing is unavailable/)).toBeVisible();
});

test("structured review uses a fixed section order, preserves scores and expands gallery photos", async ({ page }) => {
  await page.goto("/e2e-review-fixture");
  await expect(page.getByRole("heading", { name: "Test-only review." })).toBeVisible();
  await expect(page.getByLabel("Our editorial score: 0 out of 10")).toBeVisible();
  await expect(page.getByText("This article is sponsored.", { exact: false })).toBeVisible();
  const headings = await page.locator("main h2").allTextContents();
  expect(headings).toEqual(["Quick verdict", "At a glance", "Our experience", "What we tried", "Before you go", "Would we go back?", "Photo gallery"]);
  await expect(page.getByText("November 2, 2026", { exact: true })).toBeVisible();
  await expect(page.getByText("$80 per person")).toBeVisible();
  await expect(page.getByText("Our original experience and photos stay together.")).toBeVisible();
  const opener = page.getByRole("button", { name: "Enlarge photo 1: Our dinner", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Enlarged review photo" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("img", { name: "Our dinner" })).toBeVisible();
  await expect(dialog).toContainText("The first course");
  await expect(dialog).toContainText("Photo: Vegas Unfiltered");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await page.getByRole("button", { name: "Enlarge photo 2: The dining room" }).click();
  await expect(dialog.getByRole("img", { name: "The dining room" })).toBeVisible();
  await dialog.getByRole("button", { name: "Close photo" }).click();
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("review opening puts the verdict before the cover and consolidates usable visit details", async ({ page }) => {
  await page.goto("/e2e-review-fixture");
  const verdict = page.getByRole("region", { name: "Quick verdict", exact: true });
  const cover = page.getByRole("img", { name: "Review cover", exact: true });
  expect((await verdict.boundingBox())!.y).toBeLessThan((await cover.boundingBox())!.y);
  expect((await cover.boundingBox())!.height).toBeLessThanOrEqual(460);
  // Readers can reach the decision before their first scroll on desktop and mobile.
  expect((await verdict.boundingBox())!.y + (await verdict.boundingBox())!.height).toBeLessThan(page.viewportSize()!.height);
  const details = page.getByRole("region", { name: "At a glance", exact: true });
  expect((await details.boundingBox())!.x).toBe((await page.locator(".cms-review-content").boundingBox())!.x);
  await expect(details).toContainText("Test restaurant — North branch");
  await expect(details).toContainText("123 Example Road, North Las Vegas, NV 89030");
  await expect(details).toContainText("$80 per person");
  await expect(details).toContainText("November 2, 2026");
  const directions = new URL((await details.getByRole("link", { name: "Directions" }).getAttribute("href"))!);
  expect(directions.searchParams.get("destination")).toBe("Test restaurant — North branch, 123 Example Road, North Las Vegas, NV 89030");
  await expect(details.getByRole("link", { name: "Menu / website" })).toHaveAttribute("href", "https://example.com/menu");
  await expect(page.getByRole("region", { name: "Reporting details" })).toHaveCount(0);
  const navigation = page.getByRole("navigation", { name: "In this review" });
  for (const link of await navigation.getByRole("link").all()) {
    const href = (await link.getAttribute("href"))!;
    await expect(page.locator(href)).toHaveCount(1);
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await navigation.getByRole("link", { name: "Before you go", exact: true }).click();
  await expect(page).toHaveURL(/#before-you-go$/);
  await expect(page.locator("#before-you-go")).toBeInViewport();
  await expect.poll(async () => (await page.locator("#before-you-go").boundingBox())!.y).toBeGreaterThanOrEqual(82);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("activities share the format, preserve longer verdicts and skip repeated labels and cover photos", async ({ page }) => {
  await page.goto("/e2e-review-fixture/activity");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("An evening in Las Vegas: worth the trip?");
  const verdict = page.getByRole("region", { name: "Quick verdict", exact: true });
  await expect(verdict).toContainText("Worth the trip? Yes, for a relaxed evening.");
  const more = verdict.getByText("The longer explanation stays available", { exact: false });
  await expect(more).not.toBeVisible();
  await verdict.getByText("Read the full takeaway", { exact: true }).click();
  await expect(more).toBeVisible();
  await expect(page.getByText("Activity / location", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Official website" })).toHaveAttribute("href", "https://example.com/menu");
  await expect(page.getByText("What We Ordered", { exact: true })).toHaveCount(0);
  await expect(page.getByText("One Thing You Should Know Before Going", { exact: true })).toHaveCount(0);
  await expect(page.getByText("The experience itself stays intact.", { exact: true })).toBeVisible();
  const gallery = page.getByRole("region", { name: "Photo gallery", exact: true });
  await expect(gallery.getByRole("button", { name: /Enlarge photo/ })).toHaveCount(1);
  await expect(gallery.getByRole("img", { name: "The dining room" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Another evening out" })).toHaveAttribute("href", "/activities/another-evening");
  await expect(page.getByRole("link", { name: "Browse all activities" })).toHaveAttribute("href", "/activities");
  await expect(page.getByText("Links will appear here", { exact: false })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("legacy reviews inherit the shared shell without inventing optional facts or scores", async ({ page }) => {
  await page.goto("/e2e-review-fixture/legacy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Legacy review!");
  await expect(page.getByRole("heading", { name: "Our experience", exact: true })).toBeVisible();
  await expect(page.getByText("The original review is preserved without a structured template.")).toBeVisible();
  await expect(page.getByRole("region", { name: "At a glance", exact: true })).toContainText("North branch");
  await expect(page.getByRole("region", { name: "Quick verdict", exact: true })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "In this review" })).toHaveCount(0);
  await expect(page.locator(".review-score")).toHaveCount(0);
  await expect(page.getByText("Price / budget", { exact: true })).toHaveCount(0);
});

test("empty optional review sections do not render", async ({ page }) => {
  await page.goto("/e2e-review-fixture/empty");
  await expect(page.getByRole("heading", { name: "Empty review." })).toBeVisible();
  await expect(page.locator("main h2")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Enlarge photo/ })).toHaveCount(0);
});

test("guided editor keeps sections and photo choices when switching tabs", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.headers()["next-action"]) writes.push(request.url());
  });

  await page.goto("/e2e-review-fixture/editor");
  await page.getByLabel("Quick verdict", { exact: true }).fill("Our short verdict.");
  await page.getByLabel("Visit date (public, optional)").fill("2026-11-02");
  await page.getByRole("textbox", { name: "Article body", exact: true }).fill("Our evening together.");
  await page.getByRole("textbox", { name: "What we tried", exact: true }).fill("The tasting menu.");
  await page.getByRole("tab", { name: "Photos", exact: true }).click();
  await page.getByRole("button", { name: "Add: Our dinner", exact: true }).click();
  await page.getByRole("button", { name: "Add: The dining room", exact: true }).click();
  await page.getByRole("button", { name: "Move photo 2 earlier", exact: true }).click();
  await page.getByLabel("Photo 1 caption").fill("Our quiet table.");
  await page.getByRole("button", { name: "Use as cover", exact: true }).first().click();
  await expect(page.locator(".cms-review-cover")).toHaveAttribute("alt", "The dining room");
  await page.getByRole("tab", { name: "Content", exact: true }).click();
  await expect(page.getByLabel("Quick verdict", { exact: true })).toHaveValue("Our short verdict.");
  await expect(page.getByRole("textbox", { name: "Article body", exact: true })).toContainText("Our evening together.");
  await expect(page.getByRole("textbox", { name: "What we tried", exact: true })).toContainText("The tasting menu.");
  await expect(page.getByRole("combobox", { name: "Featured image", exact: true })).toHaveValue("123e4567-e89b-42d3-a456-426614174001");
  await page.getByRole("tab", { name: "Photos", exact: true }).click();
  await expect(page.getByLabel("Photo 1 caption")).toHaveValue("Our quiet table.");
  await page.getByRole("button", { name: "Remove photo 1 from gallery", exact: true }).click();
  await expect(page.getByLabel("Photo 1 alt text")).toHaveValue("Our dinner");
  await expect(page.getByRole("button", { name: "Add: The dining room", exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});

test("unsaved review navigation warns and cancelling keeps the writing", async ({ page }) => {
  await page.goto("/e2e-review-fixture/editor");
  await page.getByRole("textbox", { name: "Article body", exact: true }).fill("Keep these unsaved notes.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Not saved" })).toContainText("Headline");
  const prompt = page.waitForEvent("dialog");
  const leaving = page.getByRole("link", { name: "Back to reviews", exact: true }).click();
  const dialog = await prompt;
  expect(dialog.type()).toBe("confirm");
  expect(dialog.message()).toContain("unsaved changes");
  await dialog.dismiss();
  await leaving;
  await expect(page).toHaveURL(/\/e2e-review-fixture\/editor$/);
  await expect(page.getByRole("textbox", { name: "Article body", exact: true })).toContainText("Keep these unsaved notes.");
  await page.getByRole("tab", { name: "Photos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Photo gallery", exact: true })).toBeVisible();
});

test("unchanged review editor can navigate without an unsaved-changes warning", async ({ page }) => {
  await page.goto("/e2e-review-fixture/editor");
  const dialogs: string[] = [];
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  await page.getByRole("link", { name: "Back to reviews", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/reviews$/);
  expect(dialogs).toEqual([]);
});

test("review edits preserved at session expiry can be explicitly restored after return", async ({ page }) => {
  await page.goto("/e2e-review-fixture/editor");
  await page.getByRole("textbox", { name: "Article body", exact: true }).fill("Notes preserved at timeout.");
  await page.evaluate(() => window.dispatchEvent(new Event("cms-session-expiring")));
  await page.reload();
  await expect(page.getByRole("button", { name: "Restore unsaved review" })).toBeVisible();
  await page.getByRole("button", { name: "Restore unsaved review" }).click();
  await expect(page.getByRole("textbox", { name: "Article body", exact: true })).toContainText("Notes preserved at timeout.");
  await expect(page.getByRole("button", { name: "Restore unsaved review" })).toHaveCount(0);
});

test("inactivity warning appears only during the final two minutes", async ({ page }) => {
  await page.clock.install({ time: new Date("2099-12-31T23:30:00Z") });
  await page.goto("/e2e-review-fixture/idle");
  await expect(page.getByRole("heading", { name: "Session timer test" })).toBeVisible();
  const warning = page.getByRole("alert", { name: "Session timeout warning" });
  await expect(warning).toHaveCount(0);
  await page.clock.fastForward(27 * 60_000);
  await expect(warning).toHaveCount(0);
  await page.clock.fastForward(61_000);
  await expect(warning).toBeVisible();
  await expect(warning.getByRole("button", { name: "Stay signed in" })).toBeVisible();
  await expect(warning).toContainText("Unsaved review edits");
});

test("inline place form preserves the story and validates before creating", async ({ page }) => {
  await page.goto("/e2e-review-fixture/editor");
  await page.getByRole("textbox", { name: "Article body", exact: true }).fill("A visit worth writing about.");
  await page.getByRole("button", { name: "Create and link place", exact: true }).click();
  await expect(page.getByRole("region", { name: "Create a place without leaving this review" })).toBeVisible();
  await expect(page.locator("form form")).toHaveCount(0);
  await page.getByRole("button", { name: "Create place and select", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Enter a place name" })).toBeVisible();
  await page.getByLabel("New place name", { exact: true }).fill("Somewhere local");
  await page.getByRole("button", { name: "Cancel new place", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Article body", exact: true })).toContainText("A visit worth writing about.");
  await expect(page.getByRole("combobox", { name: "Place reviewed", exact: true })).toHaveValue("");
});

test("rich-text toolbar labels fit their buttons without overlap on mobile and desktop", async ({ page }) => {
  await page.goto("/e2e-review-fixture/editor");
  const toolbar = page.getByRole("toolbar", { name: "Text formatting" }).first();
  await expect(toolbar.getByRole("button", { name: "Numbered list", exact: true })).toBeVisible();
  const problems = await toolbar.evaluate((element) => {
    const buttons = [...element.querySelectorAll("button")];
    return buttons.flatMap((button, index) => {
      const rect = button.getBoundingClientRect();
      const previous = buttons.slice(0, index).some((other) => {
        const bounds = other.getBoundingClientRect();
        return rect.left < bounds.right && rect.right > bounds.left && rect.top < bounds.bottom && rect.bottom > bounds.top;
      });
      return button.scrollWidth > button.clientWidth || rect.height < 44 || previous ? [button.textContent] : [];
    });
  });
  expect(problems).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
