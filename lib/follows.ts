import { supabase } from "./supabase";

export async function followUser(followerId: string, followingId: string) {
  if (!supabase) return;
  await supabase.from("follows").insert({ follower_id: followerId, following_id: followingId, status: "pending" });
}

export async function unfollowUser(followerId: string, followingId: string) {
  if (!supabase) return;
  await supabase.from("follows").delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
}

export async function acceptFollow(requesterId: string, currentUserId: string) {
  if (!supabase) return;
  // Mark their request as accepted
  await supabase.from("follows")
    .update({ status: "accepted" })
    .eq("follower_id", requesterId)
    .eq("following_id", currentUserId);
  // Auto follow back to make it mutual (friends instantly)
  const { data: existing } = await supabase.from("follows")
    .select("id")
    .eq("follower_id", currentUserId)
    .eq("following_id", requesterId)
    .maybeSingle();
  if (existing) {
    await supabase.from("follows")
      .update({ status: "accepted" })
      .eq("follower_id", currentUserId)
      .eq("following_id", requesterId);
  } else {
    await supabase.from("follows").insert({
      follower_id: currentUserId,
      following_id: requesterId,
      status: "accepted",
    });
  }
}

export async function denyFollow(requesterId: string, currentUserId: string) {
  if (!supabase) return;
  await supabase.from("follows").delete()
    .eq("follower_id", requesterId)
    .eq("following_id", currentUserId);
}

export async function getFollowStatus(
  currentUserId: string,
  targetUserId: string
): Promise<{ following: boolean; followedBy: boolean; pendingThem: boolean; pendingMe: boolean }> {
  if (!supabase) return { following: false, followedBy: false, pendingThem: false, pendingMe: false };

  const [{ data: iFollow }, { data: theyFollow }] = await Promise.all([
    supabase.from("follows").select("id, status").eq("follower_id", currentUserId).eq("following_id", targetUserId).maybeSingle(),
    supabase.from("follows").select("id, status").eq("follower_id", targetUserId).eq("following_id", currentUserId).maybeSingle(),
  ]);

  return {
    following: iFollow?.status === "accepted",
    pendingThem: iFollow?.status === "pending",
    followedBy: theyFollow?.status === "accepted",
    pendingMe: theyFollow?.status === "pending",
  };
}

export async function getFriendsCount(userId: string): Promise<number> {
  if (!supabase) return 0;

  const { data: iFollow } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("status", "accepted");

  if (!iFollow?.length) return 0;

  const followingIds = iFollow.map((r) => r.following_id);
  const { count } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", userId)
    .eq("status", "accepted")
    .in("follower_id", followingIds);

  return count ?? 0;
}

export async function getPendingRequests(userId: string): Promise<{ id: string; username: string }[]> {
  if (!supabase) return [];

  const { data: pending } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId)
    .eq("status", "pending");

  if (!pending?.length) return [];

  const ids = pending.map((r) => r.follower_id);
  const { data: users } = await supabase
    .from("users")
    .select("id, username")
    .in("id", ids);

  return users ?? [];
}
