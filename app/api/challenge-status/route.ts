import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Look at the most recent sent notification (not just today — user may open app next day)
  const { data } = await supabase
    .from("daily_notifications")
    .select("date, scheduled_hour, scheduled_minute, sent")
    .eq("sent", true)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return NextResponse.json({ active: false });

  const now = new Date();
  const minute = data.scheduled_minute ?? 0;
  const startsAt = new Date(`${data.date}T${String(data.scheduled_hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  if (now >= endsAt) {
    // Check if user posted during the window — if not, it's a failure
    if (userId) {
      // Only count as failed if the user existed before the challenge window ended
      const { data: userRow } = await supabase
        .from("users")
        .select("created_at")
        .eq("id", userId)
        .single();

      const userCreatedAt = userRow?.created_at ? new Date(userRow.created_at as string) : null;
      if (userCreatedAt && userCreatedAt >= endsAt) {
        // User signed up after the window closed — not a failure
        return NextResponse.json({ active: false });
      }

      const { data: post } = await supabase
        .from("posts")
        .select("id")
        .eq("user_id", userId)
        .gte("created_at", startsAt.toISOString())
        .lte("created_at", endsAt.toISOString())
        .limit(1)
        .maybeSingle();

      if (!post) return NextResponse.json({ active: false, failed: true, failedDate: data.date });
    }
    return NextResponse.json({ active: false });
  }

  // Window is currently active
  if (userId) {
    const { data: post } = await supabase
      .from("posts")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", startsAt.toISOString())
      .lte("created_at", endsAt.toISOString())
      .limit(1)
      .maybeSingle();

    if (post) return NextResponse.json({ active: false, completed: true });
  }

  return NextResponse.json({ active: true, endsAt: endsAt.toISOString() });
}
