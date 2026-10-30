"use server";

import "server-only";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCmsRole } from "@/lib/admin-auth";
import { getSupabaseEnvironment } from "@/lib/supabase/env";

const inviteSchema = z.object({
  email: z.string().trim().email().max(320).transform((email) => email.toLowerCase()),
  displayName: z.string().trim().min(1).max(100),
  role: z.enum(["editor", "contributor"]),
});

export async function inviteTeamMember(input: unknown) {
  if (input instanceof FormData) input = Object.fromEntries(input.entries());
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check invitation details." };
  await requireCmsRole(["owner"]);
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, message: "Set SUPABASE_SERVICE_ROLE_KEY on the server before inviting teammates." };
  }
  const environment = getSupabaseEnvironment();
  if (!environment) throw new Error("Supabase configuration is missing.");
  const admin = createClient(environment.url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    { data: { full_name: parsed.data.displayName } },
  );
  if (inviteError) return { ok: false, message: `Invitation failed: ${inviteError.message}` };
  const { error: roleError } = await admin.auth.admin.updateUserById(invited.user.id, {
    app_metadata: { cms_role: parsed.data.role },
  });
  if (roleError) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(invited.user.id);
    if (cleanupError) {
      throw new Error(`Role assignment failed (${roleError.message}) and the incomplete invitation could not be removed (${cleanupError.message}).`);
    }
    return { ok: false, message: `Invitation could not be assigned a role and was cancelled: ${roleError.message}` };
  }
  revalidatePath("/admin/team");
  return { ok: true, message: `Invitation sent to ${parsed.data.email}.` };
}

export async function updateTeamRole(input: unknown) {
  if (input instanceof FormData) input = Object.fromEntries(input.entries());
  const parsed = z.object({
    userId: z.string().uuid(),
    role: z.enum(["editor", "contributor"]),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Team role change is invalid." };
  const { identity } = await requireCmsRole(["owner"]);
  if (parsed.data.userId === identity.id) {
    return { ok: false, message: "You cannot change your own owner role." };
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, message: "Set SUPABASE_SERVICE_ROLE_KEY on the server before managing team roles." };
  }
  const environment = getSupabaseEnvironment();
  if (!environment) throw new Error("Supabase configuration is missing.");
  const admin = createClient(environment.url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userResult, error: loadError } = await admin.auth.admin.getUserById(parsed.data.userId);
  if (loadError) return { ok: false, message: `Could not load team account: ${loadError.message}` };
  if (!userResult.user) return { ok: false, message: "Team account not found." };
  if (userResult.user.app_metadata.cms_role === "owner") {
    return { ok: false, message: "Owner roles must be managed through the documented manual bootstrap process." };
  }
  const { error } = await admin.auth.admin.updateUserById(parsed.data.userId, {
    app_metadata: { cms_role: parsed.data.role },
  });
  if (error) return { ok: false, message: `Team role was not changed: ${error.message}` };
  revalidatePath("/admin/team");
  return { ok: true, message: `Role updated to ${parsed.data.role}.` };
}
