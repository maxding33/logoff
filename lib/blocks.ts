import { supabase } from "./supabase";

export async function getBlockedIds(userId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", userId);
  return (data ?? []).map((r: { blocked_id: string }) => r.blocked_id);
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (!supabase) throw new Error("No client");
  const { error } = await supabase
    .from("blocks")
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error && error.code !== "23505") throw error; // ignore duplicate
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  if (!supabase) throw new Error("No client");
  await supabase.from("blocks").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId);
}

export async function checkIsBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId)
    .maybeSingle();
  return !!data;
}
