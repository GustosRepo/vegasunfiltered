import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = Buffer.from(authorization.replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(secret ?? "");
  if (!secret || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Scheduled publishing is not configured." }, { status: 503 });
  }

  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.rpc("publish_due_articles");
  if (error) {
    console.error("Scheduled article publishing failed:", error.message);
    return NextResponse.json({ error: "Scheduled articles could not be published." }, { status: 500 });
  }
  if (data?.length) {
    revalidateTag("published-cms", { expire: 0 });
    revalidatePath("/", "layout");
    revalidatePath("/sitemap.xml");
  }
  return NextResponse.json({ published: data?.length ?? 0 });
}
