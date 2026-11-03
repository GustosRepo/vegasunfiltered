import { test, expect, png, saveForm } from "./fixtures";

test("admin warns before inactivity logout and stay signed in renews the deadline", async ({ ownerPage: page, backend }) => {
  const { error } = await backend.admin.from("cms_idle_sessions").update({
    last_active_at: new Date(Date.now() - 29 * 60_000).toISOString(),
  }).eq("user_id", backend.accounts.owner.id);
  if (error) throw error;
  await page.reload();
  const warning = page.getByRole("alert", { name: "Session timeout warning" });
  await expect(warning).toBeVisible();
  await warning.getByRole("button", { name: "Stay signed in" }).click();
  await expect(warning).not.toBeVisible();
  const { data, error: loadError } = await backend.admin.from("cms_idle_sessions").select("last_active_at").eq("user_id", backend.accounts.owner.id).single();
  if (loadError) throw loadError;
  expect(Date.now() - Date.parse(data.last_active_at)).toBeLessThan(30_000);
});

test("owner can use every admin section and sign out", async ({ ownerPage: page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [path, title] of [
    ["reviews", "Reviews"], ["places", "Places"], ["visits", "Visits"],
    ["media", "Media library"], ["neighborhoods", "Neighborhoods"], ["seo", "SEO audit"],
    ["analytics", "Analytics"], ["affiliates", "Affiliate links"], ["team", "Team"], ["settings", "Settings"],
  ]) {
    await page.getByRole("navigation", { name: "CMS navigation", exact: true }).getByRole("link", { name: title, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/${path}$`));
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Sign out", exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect(errors).toEqual([]);
});

test("login rejects bad credentials and explains missing CMS access", async ({ page, backend }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Work email").fill(backend.accounts.owner.email);
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page.getByRole("alert")).toContainText("Sign-in failed");
  await backend.login(page, "unassigned");
  await expect(page.getByRole("alert")).toContainText("no CMS role");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("no CMS role");
});

test("article draft autosaves, previews privately, publishes, unpublishes, archives and deletes", async ({ ownerPage: page, backend, browser }) => {
  await page.goto("/admin/reviews/new");
  await page.getByLabel("Headline", { exact: true }).fill(`E2E ${backend.slug}`);
  await page.getByLabel("URL slug", { exact: true }).fill(backend.slug);
  await page.getByLabel("Review type", { exact: true }).selectOption("restaurant");
  await page.getByLabel("Overall score", { exact: false }).fill("8.5");
  await page.getByLabel("Quick verdict", { exact: true }).fill("A date night worth repeating.");
  await page.getByLabel("Visit date (public, optional)").fill("2026-11-02");
  await page.getByLabel("Price / budget", { exact: true }).fill("$80 per person");
  await page.getByLabel("Best for", { exact: true }).fill("Date night");
  await page.getByLabel("Article body", { exact: true }).fill("Original reporting for end-to-end testing. ".repeat(15));
  await page.getByRole("textbox", { name: "What we tried", exact: true }).fill("The seasonal menu and two cocktails.");
  await page.getByRole("textbox", { name: "Worth knowing", exact: true }).fill("Book ahead for a quiet table.");
  await page.getByRole("textbox", { name: "Would we go back?", exact: true }).fill("Yes, for our next date night.");
  await expect(page).toHaveURL(/\/admin\/reviews\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("status").filter({ hasText: "All changes saved" })).toBeVisible();
  const id = page.url().split("/").pop()!;
  await page.getByRole("navigation", { name: "CMS navigation", exact: true }).getByRole("link", { name: "Neighborhoods", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Neighborhoods", exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "CMS navigation", exact: true }).getByRole("link", { name: "Reviews", exact: true }).click();
  await page.getByRole("link", { name: `E2E ${backend.slug}`, exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(`E2E ${backend.slug}`);
  await expect(page.getByLabel("Article body", { exact: true })).toContainText("Original reporting");
  await expect(page.getByLabel("Quick verdict", { exact: true })).toHaveValue("A date night worth repeating.");
  await expect(page.getByRole("textbox", { name: "What we tried", exact: true })).toContainText("seasonal menu");
  await page.getByRole("button", { name: "Create and link place", exact: true }).click();
  await page.getByLabel("New place name", { exact: true }).fill(`Place ${backend.slug}`);
  await page.getByLabel("Street address / location", { exact: true }).fill("123 Test-only Avenue");
  await page.getByRole("button", { name: "Create place and select", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Place created and selected" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Place reviewed", exact: true })).not.toHaveValue("");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "All changes saved" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Article body", exact: true })).toContainText("Original reporting");
  await page.getByRole("link", { name: "Private preview", exact: true }).click();
  await expect(page.getByText(/Private preview/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: `E2E ${backend.slug}` })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quick verdict", exact: true })).toBeVisible();
  await expect(page.getByText("Yes, for our next date night.")).toBeVisible();
  const anonymous = await browser.newContext();
  try {
    const visitor = await anonymous.newPage();
    await visitor.goto(`/admin/reviews/${id}/preview`);
    await expect(visitor).toHaveURL(/\/admin\/login$/);
    await expect(visitor.getByText("Original reporting")).toHaveCount(0);
    await page.goto(`/admin/reviews/${id}/edit`);
    await page.getByRole("tab", { name: "SEO", exact: true }).click();
    await page.getByLabel("SEO title", { exact: true }).fill(`E2E published ${backend.slug}`);
    await page.getByLabel("Meta description", { exact: true }).fill("A verified test story covering publication and search engine discovery.");
    await page.getByLabel(/Allow search engines/).check();
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "All changes saved" })).toBeVisible();
    for (const [button, status] of [
      ["Submit for review", "in_review"], ["Approve for publication", "approved"], ["Publish now", "published"],
    ]) {
      await page.getByRole("tab", { name: "Publishing", exact: true }).click();
      await page.getByRole("button", { name: button, exact: true }).click();
      await expect.poll(async () => {
        const { data, error } = await backend.admin.from("articles").select("status").eq("id", id).single();
        if (error) throw error;
        return data.status;
      }).toBe(status);
      await expect(page.locator(".cms-overline").filter({ hasText: `REVIEW WORKSPACE · ${status.replace("_", " ").toUpperCase()}` })).toBeVisible();
    }
    await visitor.goto(`/restaurants/${backend.slug}`);
    await expect(visitor.getByRole("heading", { name: `E2E ${backend.slug}` })).toBeVisible();
    await expect(visitor.getByLabel("Our editorial score: 8.5 out of 10")).toBeVisible();
    await expect(visitor.locator('meta[name="robots"]')).not.toHaveAttribute("content", /noindex/);
    expect(await (await visitor.request.get("/sitemap.xml")).text()).toContain(`/restaurants/${backend.slug}`);
    await page.getByRole("tab", { name: "Publishing", exact: true }).click();
    await page.getByRole("button", { name: "Unpublish", exact: true }).click();
    await expect(page.locator(".cms-overline")).toContainText("DRAFT");
    await visitor.goto(`/restaurants/${backend.slug}`);
    await expect(visitor.getByRole("heading", { name: /could not be found|404/i }).first()).toBeVisible();
    await expect(visitor.getByText("Original reporting")).toHaveCount(0);
    await page.getByRole("tab", { name: "Publishing", exact: true }).click();
    await page.getByRole("button", { name: "Archive", exact: true }).click();
    await expect(page.locator(".cms-overline")).toContainText("ARCHIVED");
    await page.getByRole("button", { name: "Delete review", exact: true }).click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("button", { name: "Delete review", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Delete review", exact: true }).click();
    await page.getByRole("button", { name: "Confirm delete", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/reviews$/);
    const { data, error } = await backend.admin.from("articles").select("id").eq("id", id);
    if (error) throw error;
    expect(data).toEqual([]);
  } finally {
    await anonymous.close();
  }
});

test("SEO audit directs missing author and cover issues to the settings and photos that fix them", async ({ ownerPage: page, backend }) => {
  const article = await backend.seedArticle({ status: "published", indexable: true });
  const { error } = await backend.admin.from("profiles").update({ display_name: "" }).eq("id", backend.accounts.owner.id);
  if (error) throw error;
  await page.goto("/admin/seo");
  const authorIssue = page.locator("li").filter({ hasText: article.title }).filter({ hasText: "Author attribution is missing" });
  await authorIssue.getByRole("link", { name: article.title, exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/settings#author-profile$/);
  const name = `E2E Author ${backend.slug}`;
  await page.getByLabel("Public author name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Save author profile", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Author profile saved" })).toBeVisible();
  const { data: profile, error: profileError } = await backend.admin.from("profiles").select("display_name,role").eq("id", backend.accounts.owner.id).single();
  if (profileError) throw profileError;
  expect(profile).toEqual({ display_name: name, role: "owner" });
  // Future role synchronization must keep the chosen public byline.
  const { error: syncError } = await backend.admin.auth.admin.updateUserById(backend.accounts.owner.id, { app_metadata: { cms_role: "owner" } });
  if (syncError) throw syncError;
  await page.goto("/admin/seo");
  await expect(page.locator("li").filter({ hasText: article.title }).filter({ hasText: "Author attribution is missing" })).toHaveCount(0);
  const photoIssue = page.locator("li").filter({ hasText: article.title }).filter({ hasText: "Featured image is missing" });
  await photoIssue.getByRole("link", { name: article.title, exact: true }).click();
  await expect(page.getByRole("tab", { name: "Photos", exact: true })).toHaveAttribute("aria-selected", "true");
});

test("SEO indexing can be enabled and disabled after publication without republishing", async ({ ownerPage: page, backend, browser }) => {
  const article = await backend.seedArticle({ status: "published", indexable: false });
  await page.goto(`/admin/reviews/${article.id}/edit?tab=seo`);
  await expect(page.getByRole("tab", { name: "SEO", exact: true })).toHaveAttribute("aria-selected", "true");
  const visitor = await browser.newPage();
  try {
    for (const enabled of [true, false, true]) {
      await page.getByLabel(/Allow search engines/).setChecked(enabled);
      await page.getByRole("button", { name: "Save changes", exact: true }).click();
      await expect.poll(async () => {
        const { data, error } = await backend.admin.from("articles").select("is_indexable,status").eq("id", article.id).single();
        if (error) throw error;
        return data;
      }).toEqual({ is_indexable: enabled, status: "published" });
      await expect(page.getByRole("status").filter({ hasText: "All changes saved" })).toBeVisible();
      await visitor.goto(`/restaurants/${article.slug}`);
      if (enabled) await expect(visitor.locator('meta[name="robots"]')).not.toHaveAttribute("content", /noindex/);
      else await expect(visitor.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      const sitemap = await (await visitor.request.get("/sitemap.xml")).text();
      expect(sitemap.includes(`/restaurants/${article.slug}`)).toBe(enabled);
    }
  } finally { await visitor.close(); }
});

test("review photos upload in place, reorder, persist captions, select a cover, and preview", async ({ ownerPage: page, backend }) => {
  const article = await backend.seedArticle();
  await page.goto(`/admin/reviews/${article.id}/edit`);
  await page.getByRole("tab", { name: "Photos", exact: true }).click();
  const upload = page.locator("form").filter({ has: page.getByLabel("Image file") });
  for (const name of ["First dish", "Second dish"]) {
    await upload.getByLabel("Image file").setInputFiles(png);
    await upload.getByLabel("Alt text", { exact: true }).fill(name);
    await upload.getByLabel("Caption", { exact: true }).fill(`${name} caption`);
    await upload.getByLabel("Photographer credit", { exact: true }).fill("Our photos");
    await upload.getByRole("button", { name: "Upload image", exact: true }).click();
    await expect(page.getByLabel(`Photo ${name === "First dish" ? 1 : 2} alt text`)).toHaveValue(name);
  }
  await page.getByRole("button", { name: "Move photo 2 earlier", exact: true }).click();
  await expect(page.getByLabel("Photo 1 alt text")).toHaveValue("Second dish");
  await page.getByLabel("Photo 1 caption").fill("Our favorite dish");
  await page.getByRole("button", { name: "Use as cover", exact: true }).first().click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "All changes saved" })).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Photos", exact: true }).click();
  await expect(page.getByLabel("Photo 1 alt text")).toHaveValue("Second dish");
  await expect(page.getByLabel("Photo 1 caption")).toHaveValue("Our favorite dish");
  await expect(page.locator(".cms-review-cover")).toHaveAttribute("alt", "Second dish");
  await page.getByRole("link", { name: "Private preview", exact: true }).click();
  await expect(page.getByText("Our favorite dish", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Enlarge photo 1: Second dish" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto(`/admin/reviews/${article.id}/edit`);
  await page.getByRole("tab", { name: "Photos", exact: true }).click();
  await page.getByRole("button", { name: "Remove photo 1 from gallery" }).click();
  await expect(page.getByLabel("Photo 1 alt text")).toHaveValue("First dish");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "All changes saved" })).toBeVisible();
  const { count, error } = await backend.admin.from("media").select("id", { count: "exact", head: true }).eq("uploaded_by", backend.accounts.owner.id);
  if (error) throw error;
  expect(count).toBe(2);
});

test("article filters, duplication, and concurrent edit conflict", async ({ ownerPage: page, backend }) => {
  const article = await backend.seedArticle();
  await page.goto("/admin/reviews");
  await page.getByLabel("Search review titles").fill(article.title);
  await page.getByLabel("Filter by status").selectOption("published");
  await expect(page.getByRole("link", { name: article.title, exact: true })).toHaveCount(0);
  await page.getByLabel("Filter by status").selectOption("draft");
  const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: article.title, exact: true }) });
  await row.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(row.getByRole("status")).toContainText(/Saved/i);
  await page.getByLabel("Search review titles").fill(`Copy of ${article.title}`);
  await expect(page.getByRole("link", { name: `Copy of ${article.title}`, exact: true })).toBeVisible();
  await page.goto(`/admin/reviews/${article.id}/edit`);
  const { error } = await backend.admin.from("articles").update({ title: "Concurrent editor change" }).eq("id", article.id);
  if (error) throw error;
  await page.getByLabel("Headline", { exact: true }).fill("Local stale change");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(/Another editor changed/);
  await expect.poll(async () => {
    const { data, error: loadError } = await backend.admin.from("articles").select("title").eq("id", article.id).single();
    if (loadError) throw loadError;
    return data.title;
  }).toBe("Concurrent editor change");
});

test("restaurant create, validation, edit, filter and delete", async ({ ownerPage: page, backend }) => {
  await page.goto("/admin/places/new");
  await page.getByLabel("Name", { exact: true }).fill(backend.slug);
  await page.getByLabel("URL slug", { exact: true }).fill(backend.slug);
  await page.getByLabel("Operating hours (JSON)", { exact: false }).fill("not json");
  await saveForm(page, "Operating hours must be valid JSON");
  await page.getByLabel("Operating hours (JSON)", { exact: false }).fill('{"Monday":"Closed"}');
  await saveForm(page, "Place saved.");
  await page.goto("/admin/places");
  await page.getByRole("link", { name: backend.slug, exact: true }).click();
  await page.getByLabel("Cuisine / activity description", { exact: true }).fill("Test cuisine");
  await page.getByLabel("Visit status").selectOption("visited");
  await saveForm(page, "Place saved.");
  await page.reload();
  await expect(page.getByLabel("Cuisine / activity description", { exact: true })).toHaveValue("Test cuisine");
  await page.getByRole("button", { name: "Delete place", exact: true }).click();
  await page.getByRole("button", { name: "Confirm delete", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/places$/);
  await expect(page.getByRole("link", { name: backend.slug, exact: true })).toHaveCount(0);
});

test("neighborhood creation and updates persist", async ({ ownerPage: page, backend }) => {
  await page.goto("/admin/neighborhoods");
  const form = page.locator("form").filter({ has: page.locator('input[name="slug"][value=""]') });
  await form.getByLabel("Name", { exact: true }).fill(backend.slug);
  await form.getByLabel("Slug", { exact: true }).fill(backend.slug);
  await form.getByLabel("Local description").fill("Verified local context.");
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(form.getByRole("status")).toContainText("Neighborhood saved.");
  const record = page.locator("form").filter({ has: page.locator(`input[name="slug"][value="${backend.slug}"]`) });
  await record.getByLabel("Local description").fill("Updated local context.");
  await record.getByRole("button", { name: "Save changes" }).click();
  await expect(record.getByRole("status")).toContainText("Neighborhood saved.");
  await page.reload();
  await expect(page.locator("form").filter({ has: page.locator(`input[name="slug"][value="${backend.slug}"]`) }).getByLabel("Local description")).toHaveValue("Updated local context.");
});

test("media upload, metadata, featured/social selection, search and delete", async ({ ownerPage: page, backend }) => {
  await page.goto("/admin/media");
  const upload = page.locator("form").filter({ has: page.getByLabel("Image file") });
  await upload.getByLabel("Image file").setInputFiles(png);
  await upload.getByLabel("Alt text", { exact: true }).fill(backend.slug);
  await upload.getByRole("button", { name: "Upload image", exact: true }).click();
  await expect(upload.getByRole("status")).toContainText("Image uploaded.");
  await page.getByLabel("Search media", { exact: true }).fill(backend.slug);
  const card = page.locator(".cms-media-card").filter({ has: page.getByAltText(backend.slug, { exact: true }) });
  await expect(card).toHaveCount(1);
  await card.getByLabel("Caption", { exact: true }).fill("Updated E2E caption");
  await card.getByRole("button", { name: "Save changes" }).click();
  await expect(card.getByRole("status")).toContainText(/updated/i);
  const article = await backend.seedArticle();
  await page.goto(`/admin/reviews/${article.id}/edit`);
  await page.getByLabel("Featured image", { exact: true }).selectOption({ label: backend.slug });
  await page.getByRole("tab", { name: "SEO", exact: true }).click();
  await page.getByLabel("Social sharing image").selectOption({ label: backend.slug });
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "All changes saved" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Featured image", { exact: true })).not.toHaveValue("");
  await page.getByRole("tab", { name: "SEO", exact: true }).click();
  await expect(page.getByLabel("Social sharing image")).not.toHaveValue("");
  await page.goto("/admin/media");
  await page.getByLabel("Search media", { exact: true }).fill(backend.slug);
  await page.getByRole("button", { name: "Delete image", exact: true }).click();
  await page.getByRole("button", { name: "Confirm delete", exact: true }).click();
  await expect(page.locator(".cms-media-card").filter({ has: page.getByAltText(backend.slug, { exact: true }) })).toHaveCount(0);
});

test("affiliate disclosure, HTTPS validation, activation and deactivation", async ({ ownerPage: page, backend, request }) => {
  const article = await backend.seedArticle({ status: "published", indexable: true });
  await page.goto("/admin/affiliates");
  const form = page.locator("form").filter({ has: page.locator('input[name="label"][value=""]') });
  await form.getByLabel("Public label").fill(backend.slug);
  await form.getByLabel("Destination URL (HTTPS)").fill("http://example.test/offer");
  await form.getByLabel("Associated article").selectOption(article.id);
  await form.getByLabel("Disclosure").fill("We may receive a test commission.");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(form.getByRole("status")).toContainText("HTTPS");
  await form.getByLabel("Destination URL (HTTPS)").fill("https://example.test/offer");
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(form.getByRole("status")).toContainText("Affiliate link saved.");
  const html = await (await request.get(`/restaurants/${article.slug}`)).text();
  expect(html).toContain(backend.slug);
  expect(html).toContain("sponsored");
  await page.getByRole("button", { name: "Deactivate link", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "deactivated" })).toBeVisible();
  expect(await (await request.get(`/restaurants/${article.slug}`)).text()).not.toContain('href="https://example.test/offer"');
});

test("owner invites a teammate and changes their role", async ({ ownerPage: page, backend }) => {
  await page.goto("/admin/team");
  const invite = page.locator("form").filter({ has: page.locator('input[name="email"]') });
  const email = `${backend.slug}-invited@example.test`;
  await invite.getByLabel("Name", { exact: true }).fill("E2E invited teammate");
  await invite.getByLabel("Email", { exact: true }).fill(email);
  await invite.getByLabel("Role", { exact: true }).selectOption("contributor");
  await invite.getByRole("button", { name: "Save changes" }).click();
  await expect(invite.getByRole("status")).toContainText(`Invitation sent to ${email}`);
  const row = page.getByRole("row").filter({ hasText: email });
  await row.getByRole("combobox").selectOption("editor");
  await row.getByRole("button", { name: "Save changes" }).click();
  await expect(row.getByRole("status")).toContainText("Role updated to editor.");
});

test("visit totals, receipt uploads and public opt-in preserve private notes", async ({ ownerPage: page, backend, request }) => {
  const article = await backend.seedArticle({ status: "published", indexable: true });
  const { data: restaurant, error } = await backend.admin.from("restaurants").insert({
    name: backend.slug, slug: backend.slug, created_by: backend.accounts.owner.id,
  }).select("id").single();
  if (error) throw error;
  await page.goto("/admin/visits/new");
  await page.getByLabel("Place visited", { exact: true }).selectOption(restaurant.id);
  await page.getByLabel("Visit date", { exact: true }).fill("2026-01-15");
  await page.getByLabel("Food subtotal (USD)", { exact: true }).fill("40");
  await page.getByLabel("Drinks subtotal (USD)", { exact: true }).fill("10");
  await page.getByLabel("Sales tax (USD)", { exact: true }).fill("4");
  await page.getByLabel("Tip (USD)", { exact: true }).fill("10");
  await page.getByLabel("Related review").selectOption(article.id);
  await page.getByLabel("Items ordered (JSON)", { exact: false }).fill('[{"name":"E2E tacos","amount":40}]');
  await page.getByLabel("Experience notes (internal)", { exact: true }).fill(`PRIVATE-${backend.slug}`);
  await page.getByLabel("Editorial verdict", { exact: true }).fill("Verified test verdict.");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/visits\/[0-9a-f-]{36}\/edit$/);
  let html = await (await request.get(`/restaurants/${article.slug}`)).text();
  expect(html).not.toContain("E2E tacos");
  expect(html).not.toContain(`PRIVATE-${backend.slug}`);
  await page.getByLabel(/Allow verified item and cost breakdown/).check();
  await saveForm(page, "Visit saved.");
  html = await (await request.get(`/restaurants/${article.slug}`)).text();
  expect(html).toContain("E2E tacos");
  expect(html).toContain("Verified total");
  expect(html).toContain("$64.00");
  expect(html).not.toContain(`PRIVATE-${backend.slug}`);
  await page.getByLabel("Manual total override (optional)", { exact: true }).fill("60");
  await saveForm(page, "Visit saved.");
  html = await (await request.get(`/restaurants/${article.slug}`)).text();
  expect(html).toContain("Adjusted total");
  expect(html).toContain("$60.00");
  const receiptForm = page.locator("form").filter({ has: page.locator('input[name="privateReceipt"]') });
  await receiptForm.getByLabel("Private original (PDF or image)").setInputFiles(png);
  await receiptForm.getByLabel("Optional redacted public image").setInputFiles(png);
  await receiptForm.getByRole("button", { name: "Attach receipts" }).click();
  await expect(receiptForm.getByRole("status")).toContainText("Confirm that the public copy has been redacted");
  await receiptForm.getByRole("checkbox").check();
  await receiptForm.getByRole("button", { name: "Attach receipts" }).click();
  await expect(page.getByRole("link", { name: "Open current private receipt" })).toBeVisible();
  const visitId = page.url().split("/").at(-2)!;
  const { data: visit, error: visitError } = await backend.admin.from("restaurant_visits")
    .select("receipt_storage_path,public_receipt_storage_path").eq("id", visitId).single();
  if (visitError) throw visitError;
  const privateResponse = await request.get(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/private-receipts/${visit.receipt_storage_path}`);
  expect(privateResponse.ok()).toBe(false);
  html = await (await request.get(`/restaurants/${article.slug}`)).text();
  expect(html).not.toContain(visit.receipt_storage_path);
  expect(html).toContain(visit.public_receipt_storage_path.split("/").pop());
  await page.getByLabel(/Allow verified item and cost breakdown/).uncheck();
  await saveForm(page, "Visit saved.");
  expect(await (await request.get(`/restaurants/${article.slug}`)).text()).not.toContain("E2E tacos");
});

test("schedule validates time and the authenticated cron publishes only due articles", async ({ ownerPage: page, backend, request }) => {
  const article = await backend.seedArticle({ status: "approved", indexable: true });
  await page.goto(`/admin/reviews/${article.id}/edit`);
  await page.getByRole("tab", { name: "Publishing", exact: true }).click();
  await page.getByLabel("Schedule for (Las Vegas time)").fill("2020-01-01T10:00");
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Choose a future time" })).toBeVisible();
  const future = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 16);
  await page.getByLabel("Schedule for (Las Vegas time)").fill(future);
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(page.locator(".cms-overline")).toContainText("SCHEDULED");
  const headers = { authorization: `Bearer ${process.env.CRON_SECRET}` };
  const early = await request.get("/api/cron/publish-scheduled", { headers });
  expect(early.status()).toBe(200);
  expect(await early.json()).toEqual({ published: 0 });
  const { error } = await backend.admin.from("articles").update({
    scheduled_at: new Date(Date.now() - 60_000).toISOString(),
  }).eq("id", article.id);
  if (error) throw error;
  const due = await request.get("/api/cron/publish-scheduled", { headers });
  expect(due.status()).toBe(200);
  expect(await due.json()).toEqual({ published: 1 });
  const { data, error: loadError } = await backend.admin.from("articles").select("status,scheduled_at,is_indexable").eq("id", article.id).single();
  if (loadError) throw loadError;
  expect(data).toMatchObject({ status: "published", scheduled_at: null, is_indexable: true });
  await page.goto(`/restaurants/${article.slug}`);
  await expect(page.getByRole("heading", { name: article.title, exact: true })).toBeVisible();
  expect(await (await request.get("/sitemap.xml")).text()).toContain(`/restaurants/${article.slug}`);
});

test("activity places, scores and linked visits use the same review workflow", async ({ ownerPage: page, backend }) => {
  const { data: place, error } = await backend.admin.from("restaurants").insert({
    name: backend.slug, slug: backend.slug, place_type: "activity", created_by: backend.accounts.owner.id,
  }).select("id").single();
  if (error) throw error;
  await page.goto(`/admin/reviews/new?place=${place.id}`);
  await expect(page.getByLabel("Review type", { exact: true })).toHaveValue("activity");
  await expect(page.getByLabel("Place reviewed", { exact: true })).toHaveValue(place.id);
  await page.getByLabel("Headline", { exact: true }).fill(`Activity ${backend.slug}`);
  await page.getByLabel("URL slug", { exact: true }).fill(backend.slug);
  await page.getByLabel("Article body", { exact: true }).fill("Our activity experience together.");
  await page.getByLabel("Overall score", { exact: false }).fill("0");
  await expect(page).toHaveURL(/\/admin\/reviews\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("status").filter({ hasText: "All changes saved" })).toBeVisible();
  const id = page.url().split("/").pop()!;
  const { data: review, error: reviewError } = await backend.admin.from("articles")
    .select("review_type,overall_score,restaurant_id").eq("id", id).single();
  if (reviewError) throw reviewError;
  expect(review).toMatchObject({ review_type: "activity", overall_score: 0, restaurant_id: place.id });
  await page.getByRole("link", { name: "Private preview", exact: true }).click();
  await expect(page.getByLabel("Our editorial score: 0 out of 10")).toBeVisible();
  await page.goto(`/admin/reviews/${id}/edit`);
  await page.getByRole("link", { name: "Record this visit", exact: true }).click();
  await expect(page.getByLabel("Place visited", { exact: true })).toHaveValue(place.id);
  await expect(page.getByLabel("Related review", { exact: true })).toHaveValue(id);
});
