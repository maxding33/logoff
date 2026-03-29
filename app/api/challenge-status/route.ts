import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ active: false });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("daily_notifications")
    .select("scheduled_hour, sent")
    .eq("user_id", userId)
    .eq("date", today)
    .eq("sent", true)
    .maybeSingle();

  if (!data) return NextResponse.json({ active: false });

  // Challenge window: scheduled_hour UTC to scheduled_hour+1 UTC
  const now = new Date();
  const endsAt = new Date(`${today}T${String(data.scheduled_hour).padStart(2, "0")}:00:00Z`);
  endsAt.setHours(endsAt.getUTCHours() + 1);

  if (now >= endsAt) return NextResponse.json({ active: false });

  return NextResponse.json({ active: true, endsAt: endsAt.toISOString() });
}
