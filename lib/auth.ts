import { supabase } from "./supabase";

function getClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export async function getCurrentUser() {
  const client = getClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const { data: profile } = await client
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function signUp(email: string, password: string, username: string) {
  const client = getClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const client = getClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const client = getClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}
