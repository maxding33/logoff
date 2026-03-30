import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("daily_notifications")
    .select("scheduled_hour, scheduled_minute, sent")
    .eq("date", today)
    .eq("sent", true)
    .maybeSingle();

  if (!data) return NextResponse.json({ active: false });

  const now = new Date();
  const minute = data.scheduled_minute ?? 0;
  const startsAt = new Date(`${today}T${String(data.scheduled_hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  if (now >= endsAt) return NextResponse.json({ active: false });

  // If userId provided, check if they've already posted during the window
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
