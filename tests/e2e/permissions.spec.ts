import { createClient } from "@supabase/supabase-js";
import { test, expect } from "./fixtures";

test("contributors can draft and submit but cannot publish or access private records", async ({ page, backend }) => {
  const article = await backend.seedArticle({ author: "contributor" });
  const other = await backend.seedArticle();
  await backend.login(page, "contributor");
  await page.goto(`/admin/reviews/${article.id}/edit`);
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(article.title);
  await expect(page.getByLabel("Place reviewed")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete review", exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "Publishing", exact: true }).click();
  await page.getByRole("button", { name: "Submit for review", exact: true }).click();
  await expect(page.locator(".cms-overline")).toContainText("IN REVIEW");
  await expect(page.getByRole("button", { name: "Approve for publication" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish now" })).toHaveCount(0);
  for (const [path, message] of [
    ["places", "Place records are available to editors and owners."],
    ["visits", "Visits and receipts are private to editors and owners."],
    ["neighborhoods", "Neighborhood management is available to editors and owners."],
    ["affiliates", "Affiliate link management is available to editors and owners."],
  ]) {
    await page.goto(`/admin/${path}`);
    await expect(page.getByText(message, { exact: true })).toBeVisible();
  }
  await page.goto("/admin/team");
  await expect(page.getByText("Only an owner can invite team members.")).toBeVisible();
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { error: authError } = await client.auth.signInWithPassword(backend.accounts.contributor);
  if (authError) throw authError;
  const { error: leaseError } = await client.rpc("cms_session_deadline");
  if (leaseError) throw leaseError;
  for (const target of ["approved", "published", "archived"]) {
    const { error } = await client.rpc("transition_article", {
      p_article_id: article.id, p_target_status: target, p_scheduled_at: null,
    });

    expect(error?.code).toBe("42501");
  }
  const { data: otherArticles, error: otherError } = await client.from("articles").select("id").eq("id", other.id);
  expect(otherError).toBeNull();
  expect(otherArticles).toEqual([]);
  const { data: visits, error: visitsError } = await client.from("restaurant_visits").select("*");
  expect(visitsError).toBeNull();
  expect(visits).toEqual([]);
});

test("expired idle leases cannot renew or read private CMS records", async ({ backend }) => {
  const article = await backend.seedArticle();
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { error: loginError } = await client.auth.signInWithPassword(backend.accounts.owner);
  if (loginError) throw loginError;
  const { data: deadline, error: initError } = await client.rpc("cms_session_deadline");
  if (initError) throw initError;
  expect(Date.parse(deadline) - Date.now()).toBeGreaterThan(29 * 60_000);
  const { data: original } = await client.from("articles").select("id").eq("id", article.id);
  expect(original).toHaveLength(1);
  const { error: ageError } = await backend.admin.from("cms_idle_sessions").update({
    last_active_at: new Date(Date.now() - 31 * 60_000).toISOString(),
  }).eq("user_id", backend.accounts.owner.id);
  if (ageError) throw ageError;
  for (const touch of [false, true]) {
    const { data, error } = await client.rpc("cms_session_deadline", { p_touch: touch });
    expect(error).toBeNull();
    expect(data).toBeNull();
  }
  const { data: hidden, error: readError } = await client.from("articles").select("id").eq("id", article.id);
  expect(readError).toBeNull();
  expect(hidden).toEqual([]);
  await client.auth.signOut();
});

test("place link is required for publication but not draft saves", async ({ backend }) => {
  const article = await backend.seedArticle();
  const { data: draft, error: draftError } = await backend.admin.from("articles").select("restaurant_id").eq("id", article.id).single();
  if (draftError) throw draftError;
  expect(draft.restaurant_id).toBeNull();
  for (const status of ["scheduled", "published"]) {
    const { error } = await backend.admin.from("articles").update({
      status, scheduled_at: new Date(Date.now() + 60_000).toISOString(), published_at: new Date().toISOString(),
    }).eq("id", article.id);
    expect(error?.code).toBe("22023");
    expect(error?.message).toContain("Link a matching");
  }
  const linked = await backend.seedArticle({ status: "approved" });
  const { data: linkedRow, error: linkedError } = await backend.admin.from("articles").select("restaurant_id").eq("id", linked.id).single();
  if (linkedError) throw linkedError;
  const { error: mismatchError } = await backend.admin.from("articles").update({
    restaurant_id: linkedRow.restaurant_id, review_type: "activity", status: "published", published_at: new Date().toISOString(),
  }).eq("id", article.id);
  expect(mismatchError?.code).toBe("22023");
  const { error: publishError } = await backend.admin.from("articles").update({
    restaurant_id: linkedRow.restaurant_id, status: "published", published_at: new Date().toISOString(),
  }).eq("id", article.id);
  expect(publishError).toBeNull();
  const { error: unlinkError } = await backend.admin.from("articles").update({ restaurant_id: null }).eq("id", article.id);
  expect(unlinkError?.code).toBe("22023");
});

test("editor can review and approve but cannot invite or change team roles", async ({ page, backend }) => {
  const article = await backend.seedArticle({ status: "in_review", author: "contributor" });
  await backend.login(page, "editor");
  await page.goto(`/admin/reviews/${article.id}/edit`);
  await page.getByRole("tab", { name: "Publishing", exact: true }).click();
  await page.getByRole("button", { name: "Approve for publication", exact: true }).click();
  await expect(page.locator(".cms-overline")).toContainText("APPROVED");
  await page.goto("/admin/team");
  await expect(page.getByText("Only an owner can invite team members.")).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveCount(0);
});

test("anonymous users cannot read private tables or call publishing RPCs", async ({ backend }) => {
  const article = await backend.seedArticle();
  const anonymous = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  for (const table of ["restaurant_visits", "affiliate_links", "profiles"]) {
    const { data, error } = await anonymous.from(table).select("*");
    expect(Boolean(error) || data?.length === 0).toBe(true);
  }
  const { data, error } = await anonymous.from("articles").select("id").eq("id", article.id);
  expect(error).toBeNull();
  expect(data).toEqual([]);
  const { error: publishingError } = await anonymous.rpc("publish_due_articles");
  expect(publishingError).not.toBeNull();
});
