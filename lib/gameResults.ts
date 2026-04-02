import { supabase } from "./supabase";

function getClient() {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

export type GameResult = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  won: boolean;
  score: number;
};

export async function saveGameResult(
  userId: string,
  game: string,
  won: boolean,
  score: number
): Promise<void> {
  const db = getClient();
  const today = new Date().toISOString().slice(0, 10);
  await db.from("game_results").upsert(
    { user_id: userId, game, date: today, won, score },
    { onConflict: "user_id,game,date" }
  );
}

export async function getFriendsResults(
  userId: string,
  game: string
): Promise<GameResult[]> {
  const db = getClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await db
    .from("game_results")
    .select("user_id, won, score, users(username, avatar_url)")
    .eq("game", game)
    .eq("date", today)
    .neq("user_id", userId);
  if (error) throw error;
  return (data || []).map((r: any) => ({
    userId: r.user_id,
    username: r.users?.username ?? "unknown",
    avatarUrl: r.users?.avatar_url ?? null,
    won: r.won,
    score: r.score,
  }));
}
