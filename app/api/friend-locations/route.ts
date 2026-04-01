import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ locations: [] });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get mutual friends
  const [{ data: iFollow }, { data: theyFollow }] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", userId).eq("status", "accepted"),
    supabase.from("follows").select("follower_id").eq("following_id", userId).eq("status", "accepted"),
  ]);
  const iFollowIds = new Set((iFollow ?? []).map((r: { following_id: string }) => r.following_id));
  const friendIds = (theyFollow ?? [])
    .filter((r: { follower_id: string }) => iFollowIds.has(r.follower_id))
    .map((r: { follower_id: string }) => r.follower_id);

  if (friendIds.length === 0) return NextResponse.json({ locations: [] });

  const { data } = await supabase
    .from("user_locations")
    .select("user_id, lat, lng, updated_at, users(username, avatar_url)")
    .in("user_id", friendIds);

  return NextResponse.json({ locations: data ?? [] });
}
