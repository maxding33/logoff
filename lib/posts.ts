import { supabase } from "./supabase";
import type { Post, Comment } from "../app/types";

function getClient() {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

function formatTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export async function fetchPosts(currentUserId: string): Promise<Post[]> {
  const client = getClient();

  const { data, error } = await client
    .from("posts")
    .select(`
      id,
      image_url,
      caption,
      created_at,
      user_id,
      users(username),
      likes(id, user_id),
      comments(id, text, users(username))
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((post) => ({
    id: post.id as string,
    user: (post.users as { username: string } | null)?.username ?? "Unknown",
    image: post.image_url as string,
    caption: post.caption as string,
    createdAt: formatTime(post.created_at as string),
    liked: ((post.likes ?? []) as { user_id: string }[]).some((l) => l.user_id === currentUserId),
    likes: ((post.likes ?? []) as unknown[]).length,
    comments: ((post.comments ?? []) as { id: string; text: string; users: { username: string } | null }[]).map((c) => ({
      id: c.id,
      user: c.users?.username ?? "Unknown",
      text: c.text,
    })),
  }));
}

export async function uploadPhoto(file: File, userId: string): Promise<string> {
  const client = getClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await client.storage.from("posts").upload(path, file);
  if (error) throw error;

  const { data } = client.storage.from("posts").getPublicUrl(path);
  return data.publicUrl;
}

export async function createPost(userId: string, imageUrl: string, caption: string): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from("posts")
    .insert({ user_id: userId, image_url: imageUrl, caption });
  if (error) throw error;
}

export async function toggleLike(postId: string, userId: string, currentlyLiked: boolean): Promise<void> {
  const client = getClient();
  if (currentlyLiked) {
    await client.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
  } else {
    await client.from("likes").insert({ post_id: postId, user_id: userId });
  }
}

export async function addComment(postId: string, userId: string, text: string, username: string): Promise<Comment> {
  const client = getClient();
  const { data, error } = await client
    .from("comments")
    .insert({ post_id: postId, user_id: userId, text })
    .select("id, text")
    .single();
  if (error) throw error;
  return { id: data.id as string, user: username, text: data.text as string };
}

export async function deletePost(postId: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from("posts").delete().eq("id", postId);
  if (error) throw error;
}
