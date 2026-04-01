import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Dev-only: backdates the most recent notification by 2 hours so the challenge window appears closed
export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: notif } = await supabase
    .from("daily_notifications")
    .select("id, scheduled_hour")
    .eq("sent", true)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!notif) return NextResponse.json({ error: "no notification found" }, { status: 404 });

  const newHour = ((notif.scheduled_hour - 2) + 24) % 24;

  const { error } = await supabase
    .from("daily_notifications")
    .update({ scheduled_hour: newHour })
    .eq("id", notif.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
