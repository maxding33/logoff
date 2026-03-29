import { supabase } from "./supabase";

export async function followUser(followerId: string, followingId: string) {
  if (!supabase) return;
  await supabase.from("follows").insert({ follower_id: followerId, following_id: followingId });
}

export async function unfollowUser(followerId: string, followingId: string) {
  if (!supabase) return;
  await supabase.from("follows").delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
}

export async function getFollowStatus(
  currentUserId: string,
  targetUserId: string
): Promise<{ following: boolean; followedBy: boolean }> {
  if (!supabase) return { following: false, followedBy: false };

  const [{ data: following }, { data: followedBy }] = await Promise.all([
    supabase.from("follows").select("id").eq("follower_id", currentUserId).eq("following_id", targetUserId).maybeSingle(),
    supabase.from("follows").select("id").eq("follower_id", targetUserId).eq("following_id", currentUserId).maybeSingle(),
  ]);

  return { following: !!following, followedBy: !!followedBy };
}

export async function getFriendsCount(userId: string): Promise<number> {
  if (!supabase) return 0;

  // Friends = users I follow who also follow me back
  const { data: iFollow } = await supabase
    .from("follows").select("following_id").eq("follower_id", userId);
  if (!iFollow?.length) return 0;

  const followingIds = iFollow.map((r) => r.following_id);
  const { count } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", userId)
    .in("follower_id", followingIds);

  return count ?? 0;
}
