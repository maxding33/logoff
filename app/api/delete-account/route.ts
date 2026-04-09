import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Verify the token belongs to a real session
  const { data: { user }, error: verifyError } = await admin.auth.getUser(token);
  if (verifyError || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  // Explicitly delete peripheral data (DB cascades handle posts/comments/follows etc.)
  await admin.from("push_subscriptions").delete().eq("user_id", user.id);

  // Delete the auth user — the trigger on auth.users cascades to public.users
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
