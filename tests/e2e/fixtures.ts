import { randomUUID } from "node:crypto";
import { test as base, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Role = "owner" | "editor" | "contributor" | "unassigned";
type Account = { id: string; email: string; password: string };
type Backend = {
  admin: SupabaseClient;
  accounts: Record<Role, Account>;
  slug: string;
  login: (page: Page, role?: Role) => Promise<void>;
  seedArticle: (options?: { status?: string; author?: Role; indexable?: boolean }) => Promise<{ id: string; title: string; slug: string }>;
};

export const test = base.extend<{ backend: Backend; ownerPage: Page }>({
  backend: async ({}, provide, testInfo) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key || new URL(url).hostname !== "127.0.0.1" || new URL(url).port !== "55421") {
      throw new Error("CMS tests require the isolated local Supabase test stack on port 55421.");
    }
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const slug = `e2e-${process.env.E2E_RUN_ID}-${testInfo.testId.replace(/[^a-z0-9]/gi, "").slice(-12).toLowerCase()}-${randomUUID().slice(0, 8)}`;
    const accounts = {} as Record<Role, Account>;
    const userIds: string[] = [];
    try {
      for (const role of ["owner", "editor", "contributor", "unassigned"] as const) {
        const email = `${slug}-${role}@example.test`;
        const password = process.env.E2E_PASSWORD!;
        const { data, error } = await admin.auth.admin.createUser({
          email, password, email_confirm: true,
          app_metadata: role === "unassigned" ? {} : { cms_role: role },
          user_metadata: { full_name: `E2E ${role}` },
        });
        if (error || !data.user) throw new Error(`Could not create test ${role}: ${error?.message}`);
        userIds.push(data.user.id);
        accounts[role] = { id: data.user.id, email, password };
      }
      const login: Backend["login"] = async (page, role = "owner") => {
        await page.goto("/admin/login");
        await page.getByLabel("Work email").fill(accounts[role].email);
        await page.getByLabel("Password", { exact: true }).fill(accounts[role].password);
        await page.getByRole("button", { name: "Sign in securely" }).click();
        if (role !== "unassigned") await expect(page.getByRole("heading", { name: /Good to see you/ })).toBeVisible();
      };
      const seedArticle: Backend["seedArticle"] = async (options = {}) => {
        const articleSlug = `${slug}-${randomUUID().slice(0, 8)}`;
        const { data: category, error: categoryError } = await admin.from("categories").select("id").eq("slug", "eat").single();
        if (categoryError) throw categoryError;
        const { data, error } = await admin.from("articles").insert({
          title: `E2E story ${articleSlug}`, slug: articleSlug, kind: "editorial_story",
          author_id: accounts[options.author ?? "owner"].id,
          category_id: category.id, status: options.status ?? "draft",
          is_indexable: options.indexable ?? false,
          published_at: options.status === "published" ? new Date().toISOString() : null,
          content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `Verified E2E reporting ${articleSlug}. `.repeat(12) }] }] },
        }).select("id,title,slug").single();
        if (error) throw error;
        const { error: seoError } = await admin.from("article_seo").insert({
          article_id: data.id, seo_title: data.title.slice(0, 70),
          meta_description: "Original test reporting for validating CMS publication, caching, and discovery.",
          indexing_enabled: options.indexable ?? false,
        });
        if (seoError) throw seoError;
        return data;
      };
      await provide({ admin, accounts, slug, login, seedArticle });
    } finally {
      // Remove only records owned by this test's users, not unrelated local data.
      if (userIds.length) {
        for (const bucket of ["editorial-media", "private-receipts"]) {
          for (const id of userIds) {
            const { data, error } = await admin.storage.from(bucket).list(id, { limit: 1000 });
            if (error) throw new Error(`Could not list test uploads: ${error.message}`);
            if (data?.length) {
              const { error: removeError } = await admin.storage.from(bucket).remove(data.map((file) => `${id}/${file.name}`));
              if (removeError) throw new Error(`Could not remove test uploads: ${removeError.message}`);
            }
          }
        }
        for (const [table, column] of [
          ["restaurant_visits", "created_by"], ["affiliate_links", "created_by"],
          ["articles", "author_id"], ["restaurants", "created_by"], ["media", "uploaded_by"],
        ]) {
          const { error } = await admin.from(table).delete().in(column, userIds);
          if (error) throw new Error(`Could not clean test ${table}: ${error.message}`);
        }
        const { error } = await admin.from("neighborhoods").delete().like("slug", `${slug}%`);
        if (error) throw new Error(`Could not clean test neighborhoods: ${error.message}`);
        const { data, error: usersError } = await admin.auth.admin.listUsers({ perPage: 1000 });
        if (usersError) throw usersError;
        const cleanupUsers = data.users.filter((user) => userIds.includes(user.id) || user.email?.startsWith(`${slug}-`));
        for (const user of cleanupUsers) {
          const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
          if (deleteError) throw new Error(`Could not remove test account: ${deleteError.message}`);
        }
      }
    }
  },
  ownerPage: async ({ page, backend }, provide) => {
    await backend.login(page);
    await provide(page);
  },
});

export { expect };

export const png = {
  name: "e2e-image.png",
  mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"),
};

export async function saveForm(page: Page, message: string) {
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: message })).toBeVisible();
}
