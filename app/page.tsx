"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import BottomNav from "./BottomNav";
import FeedPost from "./FeedPost";
import UploadModal from "./UploadModal";
import type { Post } from "./types";
import { supabase } from "../lib/supabase";
import { fetchPosts, uploadPhoto, createPost, toggleLike, addComment, deletePost } from "../lib/posts";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileObjectRef = useRef<File | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [streak, setStreak] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string>("You");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);

  // Pull-to-refresh state
  const touchStartY = useRef(0);
  const pulling = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        currentUserIdRef.current = user.id;
        supabase!
          .from("users")
          .select("username")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data?.username) setCurrentUsername(data.username);
          });
      }
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("streak");
    if (saved) setStreak(Number(saved));
  }, []);

  const loadPosts = useCallback(async (userId: string, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const fetched = await fetchPosts(userId);
      setPosts(fetched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!currentUserId) return;
    loadPosts(currentUserId);
  }, [currentUserId, loadPosts]);

  // Supabase Realtime — re-fetch whenever posts/likes/comments change
  useEffect(() => {
    if (!supabase || !currentUserId) return;

    const channel = supabase
      .channel("feed-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        loadPosts(currentUserId, true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, () => {
        loadPosts(currentUserId, true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => {
        loadPosts(currentUserId, true);
      })
      .subscribe();

    return () => { supabase!.removeChannel(channel); };
  }, [currentUserId, loadPosts]);

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pulling.current) return;
    const dist = Math.max(0, Math.min(80, e.touches[0].clientY - touchStartY.current));
    setPullDistance(dist);
  };

  const handleTouchEnd = () => {
    if (pulling.current && pullDistance >= 60 && currentUserId) {
      setRefreshing(true);
      loadPosts(currentUserId, true);
    }
    pulling.current = false;
    setPullDistance(0);
  };

  const resetComposer = () => {
    setPreviewImage(null);
    setCaption("");
    fileObjectRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    fileObjectRef.current = file;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPost = async () => {
    const file = fileObjectRef.current;
    if (!file || !currentUserId) return;
    setPosting(true);
    setPostError(null);
    try {
      const imageUrl = await uploadPhoto(file, currentUserId);
      await createPost(currentUserId, imageUrl, caption.trim() || "Went outside today.");
      const updated = await fetchPosts(currentUserId);
      setPosts(updated);
      resetComposer();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Failed to post:", msg);
      setPostError(msg);
    } finally {
      setPosting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!currentUserId) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    setPosts((cur) =>
      cur.map((p) =>
        p.id === postId
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
    try {
      await toggleLike(postId, currentUserId, post.liked);
    } catch {
      setPosts((cur) =>
        cur.map((p) =>
          p.id === postId ? { ...p, liked: post.liked, likes: post.likes } : p
        )
      );
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (!currentUserId) return;
    try {
      const newComment = await addComment(postId, currentUserId, text, currentUsername);
      setPosts((cur) =>
        cur.map((p) =>
          p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p
        )
      );
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost(postId);
      setPosts((cur) => cur.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  return (
    <main
      style={{ minHeight: "100vh", background: "#ffffff", padding: "0 0 80px" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <div style={{
        overflow: "hidden",
        height: pullDistance > 0 || refreshing ? (refreshing ? 40 : pullDistance * 0.5) : 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: pullDistance === 0 ? "height 0.2s ease" : "none",
      }}>
        <p style={{ margin: 0, fontSize: "12px", color: "#999", letterSpacing: "0.06em" }}>
          {refreshing ? "refreshing..." : pullDistance >= 60 ? "release to refresh" : "pull to refresh"}
        </p>
      </div>

      <header style={{
        padding: "16px",
        borderBottom: "1px solid #e5e5e5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}>
        <Link href="/search" style={{
          position: "absolute", left: "16px", color: "#000",
          display: "flex", alignItems: "center", justifyContent: "center",
          minWidth: "44px", minHeight: "44px",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </Link>
        <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#000" }}>
          LOG<span style={{ color: "#4a7c59" }}>OFF</span>
        </p>
        <span style={{ position: "absolute", right: "16px", fontSize: "14px", fontWeight: 700, color: "#000" }}>
          {streak} 🔥
        </span>
      </header>

      <section style={{ display: "grid", gap: 0 }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "#999", fontSize: "14px", padding: "48px 0" }}>Loading...</p>
        ) : posts.length === 0 ? (
          <p style={{ textAlign: "center", color: "#999", fontSize: "14px", padding: "48px 0" }}>No posts yet. Go outside and share!</p>
        ) : (
          posts.map((post) => (
            <FeedPost
              key={post.id}
              post={post}
              currentUsername={currentUsername}
              onToggleLike={handleToggleLike}
              onAddComment={handleAddComment}
              onDeletePost={handleDeletePost}
            />
          ))
        )}
      </section>

      <UploadModal
        preview={previewImage}
        caption={caption}
        onCaptionChange={setCaption}
        onClose={resetComposer}
        onSubmit={handleSubmitPost}
        posting={posting}
        error={postError}
      />

      <BottomNav fileInputRef={fileInputRef} handlePhotoChange={handlePhotoChange} />
    </main>
  );
}
