import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "No subscription found — allow notifications first" }, { status: 404 });
  }

  await webpush.sendNotification(
    data.subscription as webpush.PushSubscription,
    JSON.stringify({
      title: "LOGOFF 🌿",
      body: "time to log off — you have 1 hour to go outside and post",
    })
  );

  // Set today's challenge window to now so the timer appears
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  await supabase.from("daily_notifications").upsert(
    {
      date: today,
      scheduled_hour: now.getUTCHours(),
      scheduled_minute: now.getUTCMinutes(),
      sent: true,
    },
    { onConflict: "date" }
  );

  return NextResponse.json({ ok: true });
}
