import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CmsRole = "owner" | "editor" | "contributor";

export type AdminIdentity = {
  id: string;
  email: string;
  displayName: string;
  role: CmsRole;
};

const roles: CmsRole[] = ["owner", "editor", "contributor"];

export async function getAdminIdentity(): Promise<{
  client: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  identity: AdminIdentity | null;
}> {
  const client = await createSupabaseServerClient();
  if (!client) return { client: null, identity: null };

  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error) {
    throw new Error(`Could not verify the current CMS session: ${error.message}`);
  }
  if (!user) return { client, identity: null };

  const roleClaim = user.app_metadata.cms_role;
  if (typeof roleClaim !== "string" || !roles.includes(roleClaim as CmsRole)) {
    return { client, identity: null };
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    throw new Error(`Could not load the CMS profile: ${profileError.message}`);
  }
  if (!profile || profile.role !== roleClaim) return { client, identity: null };

  return {
    client,
    identity: {
      id: user.id,
      email: user.email ?? "",
      displayName: profile.display_name || user.email || "Editor",
      role: profile.role as CmsRole,
    },
  };
}

export async function requireCmsRole(allowed: CmsRole[]) {
  const { client, identity } = await getAdminIdentity();
  if (!client) throw new Error("CMS_UNCONFIGURED");
  if (!identity) throw new Error("CMS_UNAUTHORIZED");
  if (!allowed.includes(identity.role)) throw new Error("CMS_FORBIDDEN");
  return { client, identity };
}

export async function requireAdminPage() {
  const { client, identity } = await getAdminIdentity();
  if (!client) return { state: "unconfigured" as const };
  if (!identity) redirect("/admin/login");
  return { state: "authenticated" as const, client, identity };
}
