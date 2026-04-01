import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();

  // Get or create today's scheduled time
  const { data: existing } = await supabase
    .from("daily_notifications")
    .select("scheduled_hour, scheduled_minute, sent")
    .eq("date", today)
    .maybeSingle();

  if (existing?.sent) {
    return NextResponse.json({ ok: true, sent: 0, alreadySent: true });
  }

  let scheduledHour = existing?.scheduled_hour as number | undefined;
  let scheduledMinute = existing?.scheduled_minute as number | undefined;

  if (scheduledHour == null) {
    const earliest = Math.max(9, currentHour);
    const latest = 20;
    if (earliest > latest) {
      return NextResponse.json({ ok: true, sent: 0, tooLate: true });
    }
    scheduledHour = earliest + Math.floor(Math.random() * (latest - earliest + 1));
    scheduledMinute = Math.floor(Math.random() * 60);
    await supabase.from("daily_notifications").upsert(
      { date: today, scheduled_hour: scheduledHour, scheduled_minute: scheduledMinute, sent: false },
      { onConflict: "date" }
    );
  }

  scheduledMinute = scheduledMinute ?? 0;

  // Check if we've reached the scheduled time
  const timeReached =
    currentHour > scheduledHour ||
    (currentHour === scheduledHour && currentMinute >= scheduledMinute);

  if (!timeReached) {
    return NextResponse.json({ ok: true, sent: 0, scheduledHour, scheduledMinute });
  }

  // It's time — send to all subscribers
  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("user_id, subscription");

  if (subsError) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  let sent = 0;
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        sub.subscription as webpush.PushSubscription,
        JSON.stringify({
          title: "LOGOFF 🌿",
          body: "time to log off. you have 1 hour to go outside and post",
        })
      );
      sent++;
    } catch (err) {
      console.error(`Failed to push to ${sub.user_id}:`, err);
    }
  }

  await supabase.from("daily_notifications").upsert(
    { date: today, scheduled_hour: scheduledHour, scheduled_minute: scheduledMinute, sent: true },
    { onConflict: "date" }
  );

  return NextResponse.json({ ok: true, sent, hour: currentHour, minute: currentMinute });
}
