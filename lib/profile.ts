import { supabase } from "./supabase";

function getClient() {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

export type UserProfile = {
  username: string;
  bio: string;
  joinDate: string;
};

export async function fetchProfile(userId: string): Promise<UserProfile> {
  const client = getClient();
  const { data, error } = await client
    .from("users")
    .select("username, bio, created_at")
    .eq("id", userId)
    .single();

  if (error) throw error;

  const joinDate = data.created_at
    ? new Date(data.created_at as string).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : "2025";

  return {
    username: (data.username as string) ?? "You",
    bio: (data.bio as string) ?? "",
    joinDate,
  };
}

export async function updateProfile(userId: string, fields: { username?: string; bio?: string }): Promise<void> {
  const client = getClient();
  const { error } = await client.from("users").update(fields).eq("id", userId);
  if (error) throw error;
}
