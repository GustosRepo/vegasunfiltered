"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().email().max(254).trim(),
  password: z.string().min(1).max(128),
});

export type LoginState = { error?: string } | undefined;

export async function signIn(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email address and password." };
  }

  const client = await createSupabaseServerClient();
  if (!client) {
    return {
      error:
        "The CMS is not configured. Set the Supabase URL and publishable key, apply the database migration, and provision an owner account.",
    };
  }

  const { error } = await client.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Sign-in failed. Check your credentials or ask the owner for access." };
  }

  redirect("/admin");
}
