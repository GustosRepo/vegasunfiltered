import "server-only";

export function getSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url && !key) return null;
  if (!url || !key) {
    throw new Error(
      "Supabase configuration is incomplete. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid absolute URL.");
  }
  if (!["https:", "http:"].includes(parsedUrl.protocol)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTP or HTTPS.");
  }

  return { url: parsedUrl.toString().replace(/\/$/, ""), key };
}

export function isSupabaseConfigured() {
  return getSupabaseEnvironment() !== null;
}
