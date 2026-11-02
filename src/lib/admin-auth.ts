import "server-only";

import { isAuthSessionMissingError } from "@supabase/supabase-js";
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
  accessError?: string;
}> {
  const client = await createSupabaseServerClient();
  if (!client) return { client: null, identity: null };

  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error) {
    if (isAuthSessionMissingError(error)) return { client, identity: null };
    throw new Error(`Could not verify the current CMS session: ${error.message}`);
  }
  if (!user) return { client, identity: null };

  const roleClaim = user.app_metadata.cms_role;
  if (typeof roleClaim !== "string" || !roles.includes(roleClaim as CmsRole)) {
    return {
      client,
      identity: null,
      accessError: "Your email and password are valid, but this account has no CMS role. Ask the owner to assign access. For the first account, complete the owner setup in README.md.",
    };
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    throw new Error(`Could not load the CMS profile: ${profileError.message}`);
  }
  if (!profile) {
    return {
      client,
      identity: null,
      accessError: "Your account has a CMS role, but its editorial profile is missing. Complete the owner setup in README.md to synchronize the profile.",
    };
  }
  if (profile.role !== roleClaim) {
    return {
      client,
      identity: null,
      accessError: "Your CMS role and editorial profile do not match. Ask the owner to synchronize your account role, then sign in again.",
    };
  }

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
