import { supabase } from "./supabase";

function getClient() {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

export type UserProfile = {
  username: string;
  displayName: string | null;
  bio: string;
  joinDate: string;
  avatarUrl: string | null;
  onboardingCompleted: boolean;
};

export type NotificationPrefs = {
  challenge: boolean;
  social: boolean;
  dms: boolean;
};

export async function fetchProfile(userId: string): Promise<UserProfile> {
  const client = getClient();
  const { data, error } = await client
    .from("users")
    .select("username, display_name, bio, created_at, avatar_url, onboarding_completed")
    .eq("id", userId)
    .single();

  if (error) throw error;

  const joinDate = data.created_at
    ? new Date(data.created_at as string).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : "2025";

  return {
    username: (data.username as string) ?? "",
    displayName: (data.display_name as string | null) ?? null,
    bio: (data.bio as string) ?? "",
    joinDate,
    avatarUrl: (data.avatar_url as string | null) ?? null,
    onboardingCompleted: (data.onboarding_completed as boolean) ?? false,
  };
}

export async function updateProfile(userId: string, fields: { username?: string; display_name?: string | null; bio?: string }): Promise<void> {
  const client = getClient();
  const { error } = await client.from("users").update(fields).eq("id", userId);
  if (error) throw error;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const client = getClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/avatar.${ext}`;

  // Remove old avatar files first
  await client.storage.from("avatars").remove([
    `${userId}/avatar.jpg`,
    `${userId}/avatar.jpeg`,
    `${userId}/avatar.png`,
    `${userId}/avatar.webp`,
    `${userId}/avatar.heic`,
  ]);

  const { error: uploadError } = await client.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = client.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await client
    .from("users")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);

  if (updateError) throw updateError;

  return avatarUrl;
}

export async function removeAvatar(userId: string): Promise<void> {
  const client = getClient();
  await client.storage.from("avatars").remove([
    `${userId}/avatar.jpg`,
    `${userId}/avatar.jpeg`,
    `${userId}/avatar.png`,
    `${userId}/avatar.webp`,
    `${userId}/avatar.heic`,
  ]);
  const { error } = await client.from("users").update({ avatar_url: null }).eq("id", userId);
  if (error) throw error;
}

export async function updateNotificationPrefs(userId: string, prefs: NotificationPrefs): Promise<void> {
  const client = getClient();
  const { error } = await client.from("users").update({ notification_prefs: prefs }).eq("id", userId);
  if (error) throw error;
}

export async function completeOnboarding(userId: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from("users").update({ onboarding_completed: true }).eq("id", userId);
  if (error) throw error;
}

export async function checkOnboardingCompleted(userId: string): Promise<boolean> {
  const client = getClient();
  const { data, error } = await client
    .from("users")
    .select("onboarding_completed")
    .eq("id", userId)
    .single();
  if (error) return true; // default to true so we don't trap users in onboarding on error
  return (data.onboarding_completed as boolean) ?? false;
}
