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
  // Verify this is coming from Vercel Cron (or a manual test with the secret)
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().split("T")[0];
  const currentHour = new Date().getUTCHours(); // 0–23

  // Get all push subscriptions
  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("user_id, subscription");

  if (subsError) {
    console.error("Failed to fetch subscriptions:", subsError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  let sent = 0;

  for (const sub of subs ?? []) {
    // Check if they already have a notification scheduled/sent today
    const { data: existing } = await supabase
      .from("daily_notifications")
      .select("scheduled_hour, sent")
      .eq("user_id", sub.user_id)
      .eq("date", today)
      .maybeSingle();

    if (existing?.sent) continue; // already done for today

    let scheduledHour = existing?.scheduled_hour as number | undefined;

    if (scheduledHour == null) {
      // Pick a random hour between 9am–8pm UTC for today
      // Only pick a future hour (or current hour)
      const earliest = Math.max(9, currentHour);
      const latest = 20;
      if (earliest > latest) continue; // too late in the day

      scheduledHour = earliest + Math.floor(Math.random() * (latest - earliest + 1));

      await supabase.from("daily_notifications").upsert(
        { user_id: sub.user_id, date: today, scheduled_hour: scheduledHour, sent: false },
        { onConflict: "user_id,date" }
      );
    }

    // Send if it's time
    if (currentHour >= scheduledHour) {
      try {
        await webpush.sendNotification(
          sub.subscription as webpush.PushSubscription,
          JSON.stringify({
            title: "LOGOFF 🌿",
            body: "time to log off — you have 1 hour to go outside and post",
          })
        );

        await supabase.from("daily_notifications").upsert(
          { user_id: sub.user_id, date: today, scheduled_hour: scheduledHour, sent: true },
          { onConflict: "user_id,date" }
        );

        sent++;
      } catch (err) {
        console.error(`Failed to push to ${sub.user_id}:`, err);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, hour: currentHour });
}
