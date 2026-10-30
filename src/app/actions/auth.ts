"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOut() {
  const client = await createSupabaseServerClient();
  if (client) {
    const { error } = await client.auth.signOut();
    if (error) throw new Error(`Could not sign out: ${error.message}`);
  }
  redirect("/admin/login");
}
