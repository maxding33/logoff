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
  comments(id, text, user_id, users(username, avatar_url))
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
  comments: { id: string; text: string; user_id: string; users: { username: string; avatar_url: string | null } | null }[];
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
      avatarUrl: c.users?.avatar_url ?? null,
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

export async function fetchPosts(currentUserId: string, filterUserId?: string, challengeOnly = false): Promise<Post[]> {
  const client = getClient();

  let query = client
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false });

  if (filterUserId) query = query.eq("user_id", filterUserId);
  if (challengeOnly) query = query.eq("is_challenge", true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p) => mapPost(p as unknown as RawPost, currentUserId));
}

function compressImage(source: File | Blob | string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = typeof source === "string" ? source : URL.createObjectURL(source);
    const needsRevoke = typeof source !== "string";
    const img = new Image();
    img.onload = () => {
      if (needsRevoke) URL.revokeObjectURL(url);
      const MAX = 1080;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Compression failed")), "image/jpeg", 0.85);
    };
    img.onerror = () => { if (needsRevoke) URL.revokeObjectURL(url); reject(new Error("Load failed")); };
    img.src = url;
  });
}

// Call this eagerly after picking a photo to ensure the file is in memory before upload
export async function preparePhoto(dataUrl: string): Promise<Blob> {
  return compressImage(dataUrl);
}

export async function uploadPhoto(blob: Blob, userId: string): Promise<string> {
  const client = getClient();
  const path = `${userId}/${Date.now()}.jpg`;

  const { error } = await client.storage.from("posts").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;

  const { data } = client.storage.from("posts").getPublicUrl(path);
  return data.publicUrl;
}

export type CalendarPost = {
  id: string;
  imageUrl: string;
  caption: string;
  createdAt: string; // raw ISO string
  isChallenge: boolean;
};

export async function fetchCalendarPosts(userId: string): Promise<CalendarPost[]> {
  const client = getClient();
  const { data, error } = await client
    .from("posts")
    .select("id, image_url, caption, created_at, is_challenge")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((p: any) => ({
    id: p.id,
    imageUrl: p.image_url,
    caption: p.caption,
    createdAt: p.created_at,
    isChallenge: p.is_challenge,
  }));
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

export async function addComment(postId: string, userId: string, text: string, username: string, avatarUrl?: string | null): Promise<Comment> {
  const client = getClient();
  const { data, error } = await client
    .from("comments")
    .insert({ post_id: postId, user_id: userId, text })
    .select("id, text")
    .single();
  if (error) throw error;
  return { id: data.id as string, user: username, userId, avatarUrl: avatarUrl ?? null, text: data.text as string };
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
