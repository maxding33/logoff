import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ shouldShow: false });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get most recent sent notification
  const { data: notif } = await supabase
    .from("daily_notifications")
    .select("date, scheduled_hour, scheduled_minute")
    .eq("sent", true)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!notif) return NextResponse.json({ shouldShow: false });

  const minute = notif.scheduled_minute ?? 0;
  const startsAt = new Date(`${notif.date}T${String(notif.scheduled_hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
  const showAt = new Date(endsAt.getTime() + 60 * 60 * 1000); // show 1 hour after window closes

  const now = new Date();
  if (now < showAt) return NextResponse.json({ shouldShow: false });

  // Get mutual friends
  const [{ data: iFollow }, { data: theyFollow }] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", userId).eq("status", "accepted"),
    supabase.from("follows").select("follower_id").eq("following_id", userId).eq("status", "accepted"),
  ]);
  const iFollowIds = new Set((iFollow ?? []).map((r: { following_id: string }) => r.following_id));
  const friendIds = (theyFollow ?? [])
    .filter((r: { follower_id: string }) => iFollowIds.has(r.follower_id))
    .map((r: { follower_id: string }) => r.follower_id);

  if (friendIds.length === 0) return NextResponse.json({ shouldShow: true, windowDate: notif.date, didntMakeIt: [], onFire: [] });

  // Get friend profiles
  const { data: profiles } = await supabase
    .from("users")
    .select("id, username, avatar_url")
    .in("id", friendIds);

  // Get all sent notifications in the last 35 days (for streak + miss count)
  const since = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const { data: notifications } = await supabase
    .from("daily_notifications")
    .select("date, scheduled_hour, scheduled_minute")
    .eq("sent", true)
    .gte("date", since)
    .order("date", { ascending: false });

  // Get all challenge posts by friends in the last 35 days
  const { data: posts } = await supabase
    .from("posts")
    .select("user_id, created_at")
    .in("user_id", friendIds)
    .eq("is_challenge", true)
    .gte("created_at", new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString());

  // Build windows from notifications
  const windows = (notifications ?? []).map((n: { date: string; scheduled_hour: number; scheduled_minute: number | null }) => {
    const min = n.scheduled_minute ?? 0;
    const start = new Date(`${n.date}T${String(n.scheduled_hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00Z`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return { date: n.date, start, end };
  });

  const thisMonth = now.toISOString().slice(0, 7);

  const didntMakeIt: { userId: string; username: string; avatarUrl: string | null; missedThisMonth: number }[] = [];
  const onFire: { userId: string; username: string; avatarUrl: string | null; streak: number }[] = [];

  for (const profile of (profiles ?? [])) {
    const friendPosts = (posts ?? []).filter((p: { user_id: string; created_at: string }) => p.user_id === profile.id);

    const hit = (start: Date, end: Date) =>
      friendPosts.some((p: { created_at: string }) => {
        const t = new Date(p.created_at).getTime();
        return t >= start.getTime() && t <= end.getTime();
      });

    // Check if they posted during today's window
    const postedToday = hit(startsAt, endsAt);

    if (!postedToday) {
      // Count misses this month (only closed windows)
      const closedThisMonth = windows.filter((w) => w.date.startsWith(thisMonth) && now > w.end);
      const missedThisMonth = closedThisMonth.filter((w) => !hit(w.start, w.end)).length;

      didntMakeIt.push({
        userId: profile.id,
        username: profile.username,
        avatarUrl: profile.avatar_url ?? null,
        missedThisMonth,
      });
    }

    // Calculate current streak (most recent closed windows first)
    let streak = 0;
    for (const w of windows) {
      if (now <= w.end) continue; // skip open/future windows
      if (hit(w.start, w.end)) {
        streak++;
      } else {
        break;
      }
    }

    if (streak >= 7) {
      onFire.push({
        userId: profile.id,
        username: profile.username,
        avatarUrl: profile.avatar_url ?? null,
        streak,
      });
    }
  }

  didntMakeIt.sort((a, b) => b.missedThisMonth - a.missedThisMonth);
  onFire.sort((a, b) => b.streak - a.streak);

  return NextResponse.json({ shouldShow: true, windowDate: notif.date, didntMakeIt, onFire });
}
