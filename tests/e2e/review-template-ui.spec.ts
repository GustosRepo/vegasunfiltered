import { test, expect } from "@playwright/test";

test("structured review uses a fixed section order, preserves scores and expands gallery photos", async ({ page }) => {
  await page.goto("/e2e-review-fixture");
  await expect(page.getByRole("heading", { name: "Test-only review." })).toBeVisible();
  await expect(page.getByLabel("Our editorial score: 0 out of 10")).toBeVisible();
  await expect(page.getByText("This article is sponsored.", { exact: false })).toBeVisible();
  const headings = await page.locator("main h2").allTextContents();
  expect(headings).toEqual(["Quick verdict", "At a glance", "Our experience", "What we tried", "Worth knowing", "Would we go back?", "Photo gallery"]);
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
