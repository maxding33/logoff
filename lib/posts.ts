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

const POST_SELECT = `
  id,
  image_url,
  caption,
  created_at,
  user_id,
  is_challenge,
  expires_at,
  users(username, avatar_url),
  likes(id, user_id),
  comments(id, text, user_id, users(username))
`;

type RawPost = {
  id: string;
  image_url: string;
  caption: string;
  created_at: string;
  user_id: string;
  is_challenge: boolean;
  expires_at: string | null;
  users: { username: string; avatar_url: string | null } | null;
  likes: { user_id: string }[];
  comments: { id: string; text: string; user_id: string; users: { username: string } | null }[];
};

function mapPost(post: RawPost, currentUserId: string): Post {
  return {
    id: post.id,
    user: post.users?.username ?? "Unknown",
    userId: post.user_id,
    avatarUrl: post.users?.avatar_url ?? null,
    image: post.image_url,
    caption: post.caption,
    createdAt: formatTime(post.created_at),
    liked: (post.likes ?? []).some((l) => l.user_id === currentUserId),
    likes: (post.likes ?? []).length,
    comments: (post.comments ?? []).map((c) => ({
      id: c.id,
      user: c.users?.username ?? "Unknown",
      userId: c.user_id,
      text: c.text,
    })),
    isChallenge: post.is_challenge,
    expiresAt: post.expires_at,
  };
}

async function getFriendIds(currentUserId: string): Promise<string[]> {
  const client = getClient();
  const [{ data: iFollow }, { data: theyFollow }] = await Promise.all([
    client.from("follows").select("following_id").eq("follower_id", currentUserId).eq("status", "accepted"),
    client.from("follows").select("follower_id").eq("following_id", currentUserId).eq("status", "accepted"),
  ]);
  const iFollowIds = new Set((iFollow ?? []).map((r) => r.following_id));
  return (theyFollow ?? []).filter((r) => iFollowIds.has(r.follower_id)).map((r) => r.follower_id);
}

export async function fetchFeedPosts(currentUserId: string): Promise<Post[]> {
  const client = getClient();
  const friendIds = await getFriendIds(currentUserId);
  const userIds = [currentUserId, ...friendIds];

  const { data, error } = await client
    .from("posts")
    .select(POST_SELECT)
    .in("user_id", userIds)
    .eq("is_challenge", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((p) => mapPost(p as unknown as RawPost, currentUserId));
}

export async function fetchFreePosts(currentUserId: string): Promise<Post[]> {
  const client = getClient();
  const friendIds = await getFriendIds(currentUserId);
  const userIds = [currentUserId, ...friendIds];

  const { data, error } = await client
    .from("posts")
    .select(POST_SELECT)
    .in("user_id", userIds)
    .eq("is_challenge", false)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((p) => mapPost(p as unknown as RawPost, currentUserId));
}

export async function fetchPosts(currentUserId: string, filterUserId?: string): Promise<Post[]> {
  const client = getClient();

  let query = client
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false });

  if (filterUserId) query = query.eq("user_id", filterUserId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p) => mapPost(p as unknown as RawPost, currentUserId));
}

export async function uploadPhoto(file: File, userId: string): Promise<string> {
  const client = getClient();
  const rawExt = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  // Normalize HEIC/HEIF (iOS camera format) to jpg for storage compatibility
  const ext = rawExt === "heic" || rawExt === "heif" ? "jpg" : rawExt;
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await client.storage.from("posts").upload(path, file);
  if (error) throw error;

  const { data } = client.storage.from("posts").getPublicUrl(path);
  return data.publicUrl;
}

export async function createPost(userId: string, imageUrl: string, caption: string, isChallenge: boolean): Promise<void> {
  const client = getClient();
  const expiresAt = isChallenge ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error } = await client
    .from("posts")
    .insert({ user_id: userId, image_url: imageUrl, caption, is_challenge: isChallenge, expires_at: expiresAt });
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
  return { id: data.id as string, user: username, userId, text: data.text as string };
}

export async function deleteComment(commentId: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from("comments").delete().eq("id", commentId);
  if (error) throw error;
}

export async function deletePost(postId: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from("posts").delete().eq("id", postId);
  if (error) throw error;
}
