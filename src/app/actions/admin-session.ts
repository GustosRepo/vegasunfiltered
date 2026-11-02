"use server";

import { requireCmsRole } from "@/lib/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function keepAdminSessionAlive(): Promise<{ deadline: number | null }> {
  return sessionDeadline(true);
}

export async function checkAdminSession(): Promise<{ deadline: number | null }> {
  return sessionDeadline(false);
}

async function sessionDeadline(touch: boolean): Promise<{ deadline: number | null }> {
  const client = await createSupabaseServerClient();
  if (!client) throw new Error("CMS_UNCONFIGURED");
  const { data, error } = await client.rpc("cms_session_deadline", { p_touch: touch });
  if (error) throw new Error(`Could not renew editorial session: ${error.message}`);
  if (!data) return { deadline: null };
  await requireCmsRole(["owner", "editor", "contributor"]);
  const deadline = Date.parse(data);
  if (!Number.isFinite(deadline)) throw new Error("CMS returned an invalid inactivity deadline.");
  return { deadline };
}
