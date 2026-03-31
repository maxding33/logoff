import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

export type StreakResult = { current: number; best: number };

export async function getStreak(userId: string): Promise<StreakResult> {
  const supabase = getClient();

  // Fetch all sent notifications, most recent first, last 365 days
  const since = new Date();
  since.setDate(since.getDate() - 365);

  const { data: notifications } = await supabase
    .from("daily_notifications")
    .select("date, scheduled_hour, scheduled_minute")
    .eq("sent", true)
    .gte("date", since.toISOString().split("T")[0])
    .order("date", { ascending: false });

  if (!notifications || notifications.length === 0) return { current: 0, best: 0 };

  // Build windows: [{ startsAt, endsAt }]
  const windows = notifications.map((n) => {
    const minute = n.scheduled_minute ?? 0;
    const startsAt = new Date(`${n.date}T${String(n.scheduled_hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    return { date: n.date, startsAt, endsAt };
  });

  // Only count windows that have already ended
  const now = new Date();
  const closedWindows = windows.filter((w) => now >= w.endsAt);
  if (closedWindows.length === 0) return { current: 0, best: 0 };

  // Fetch user's posts within the overall date range
  const oldest = closedWindows[closedWindows.length - 1].startsAt;
  const newest = closedWindows[0].endsAt;

  const { data: posts } = await supabase
    .from("posts")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", oldest.toISOString())
    .lte("created_at", newest.toISOString());

  const postTimes = (posts ?? []).map((p) => new Date(p.created_at).getTime());

  // For each window, did the user post during it?
  const hit = (w: { startsAt: Date; endsAt: Date }) =>
    postTimes.some((t) => t >= w.startsAt.getTime() && t <= w.endsAt.getTime());

  // Count current streak (most recent first, stop at first miss)
  let current = 0;
  for (const w of closedWindows) {
    if (hit(w)) current++;
    else break;
  }

  // Count best streak ever
  let best = 0;
  let run = 0;
  for (const w of [...closedWindows].reverse()) {
    if (hit(w)) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  return { current, best };
}
