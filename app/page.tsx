"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import BottomNav from "./BottomNav";
import FeedPost from "./FeedPost";
import UploadModal from "./UploadModal";
import type { Post } from "./types";
import { supabase } from "../lib/supabase";
import { fetchFeedPosts, fetchFreePosts, uploadPhoto, createPost, toggleLike, addComment, deletePost, deleteComment } from "../lib/posts";
import FreePostGrid from "./FreePostGrid";
import FriendsMap from "./FriendsMap";
import { getStreak } from "../lib/streak";
import { useChallengeTimer, useChallengeFailed, recheckChallengeStatus, isChallengeActive } from "../lib/useChallengeTimer";
import { useEndOfDaySummary } from "../lib/useEndOfDaySummary";

// Module-level cache to avoid white flash on tab switch
let cachedPosts: Post[] = [];
let cachedFreePosts: Post[] = [];
let cachedUserId: string | null = null;
let cachedUsername = "You";

function HomeInner() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileObjectRef = useRef<File | null>(null);
  const [posts, setPosts] = useState<Post[]>(cachedPosts);
  const [freePosts, setFreePosts] = useState<Post[]>(cachedFreePosts);
  const [activeTab, setActiveTab] = useState<"challenge" | "free">("challenge");
  const [expandedFreePost, setExpandedFreePost] = useState<Post | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [streak, setStreak] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(cachedUserId);
  const [currentUsername, setCurrentUsername] = useState<string>(cachedUsername);
  const [loading, setLoading] = useState(cachedPosts.length === 0);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);
  const challengeTimer = useChallengeTimer(currentUserId);
  const { failed: challengeFailedReal, failedDate } = useChallengeFailed(currentUserId);
  const [testFail, setTestFail] = useState(false);
  const [testEod, setTestEod] = useState(false);
  const challengeFailed = challengeFailedReal || testFail;

  // Persist dismissed state in localStorage keyed by failed date so it survives app close
  const failKey = testFail ? "logoff_fail_dismissed_test" : failedDate ? `logoff_fail_dismissed_${failedDate}` : null;
  const [failDismissed, setFailDismissedState] = useState(() => {
    if (typeof window === "undefined" || !failKey) return false;
    return localStorage.getItem(failKey) === "1";
  });

  const dismissFail = () => {
    if (failKey) localStorage.setItem(failKey, "1");
    setFailDismissedState(true);
  };

  // When failedDate arrives from API, re-check localStorage
  useEffect(() => {
    if (!failKey) { setFailDismissedState(false); return; }
    setFailDismissedState(localStorage.getItem(failKey) === "1");
  }, [failKey]);

  // End-of-day summary
  const { shouldShow: eodShouldShow, summary: eodSummary } = useEndOfDaySummary(currentUserId);
  const eodKey = eodSummary ? `logoff_eod_dismissed_${eodSummary.windowDate}` : null;
  const [eodDismissed, setEodDismissed] = useState(() => {
    if (typeof window === "undefined" || !eodKey) return false;
    return localStorage.getItem(eodKey) === "1";
  });
  useEffect(() => {
    if (!eodKey) { setEodDismissed(false); return; }
    setEodDismissed(localStorage.getItem(eodKey) === "1");
  }, [eodKey]);
  const dismissEod = () => {
    if (eodKey) localStorage.setItem(eodKey, "1");
    setEodDismissed(true);
  };
  // Show EoD only after fail screen is dismissed (if there was one)
  const showEod = (eodShouldShow || testEod) && !eodDismissed && (!challengeFailed || failDismissed);
  const eodData = eodSummary ?? (testEod ? {
    windowDate: "test",
    didntMakeIt: [
      { userId: "1", username: "jake", avatarUrl: null, missedThisMonth: 8 },
      { userId: "2", username: "sarah", avatarUrl: null, missedThisMonth: 3 },
    ],
    onFire: [
      { userId: "3", username: "tom", avatarUrl: null, streak: 12 },
      { userId: "4", username: "mia", avatarUrl: null, streak: 9 },
    ],
  } : null);

  // Pull-to-refresh state
  const touchStartY = useRef(0);
  const pulling = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        cachedUserId = user.id;
        currentUserIdRef.current = user.id;
        supabase!
          .from("users")
          .select("username")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data?.username) { setCurrentUsername(data.username); cachedUsername = data.username; }
          });
      }
    });
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    getStreak(currentUserId).then(({ current }) => setStreak(current));
  }, [currentUserId]);

  const loadPosts = useCallback(async (userId: string, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [fetched, fetchedFree] = await Promise.all([
        fetchFeedPosts(userId),
        fetchFreePosts(userId),
      ]);
      setPosts(fetched);
      cachedPosts = fetched;
      setFreePosts(fetchedFree);
      cachedFreePosts = fetchedFree;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      (window as any).__dismissSplash?.();
    }
  }, []);

  // Initial load — quiet if we have cached posts already
  useEffect(() => {
    if (!currentUserId) return;
    loadPosts(currentUserId, cachedPosts.length > 0);
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
    setPostError(null);
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

  const compressForCheck = (dataUrl: string): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 512;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = dataUrl;
    });

  const handleSubmitPost = async () => {
    const file = fileObjectRef.current;
    if (!file || !currentUserId) return;
    setPosting(true);
    setPostError(null);
    // Step 1: outdoor check
    if (challengeTimer && previewImage) {
      try {
        const compressed = await compressForCheck(previewImage);
        const check = await fetch("/api/check-outdoor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: compressed }),
        });
        const { outdoor } = await check.json();
        if (!outdoor) {
          setPostError("photo must be taken outside. go outside and try again");
          setPosting(false);
          return;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Outdoor check failed:", msg);
        const isNetworkError = msg === "Load failed" || msg === "Failed to fetch" || msg === "NetworkError when attempting to fetch resource.";
        setPostError(isNetworkError
          ? "no connection. check your signal and try again"
          : "outdoor check failed: " + msg);
        setPosting(false);
        return;
      }
    }

    // Step 2: upload photo
    let imageUrl: string;
    try {
      imageUrl = await uploadPhoto(file, currentUserId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Upload failed:", msg);
      setPostError("upload failed: " + msg);
      setPosting(false);
      return;
    }

    // Step 3: create post
    const isChallenge = isChallengeActive();
    try {
      await createPost(currentUserId, imageUrl, caption.trim() || (isChallenge ? "Went outside today." : " "), isChallenge);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Create post failed:", msg);
      setPostError("post failed: " + msg);
      setPosting(false);
      return;
    }

    // Step 4: refresh feeds + finish
    try {
      const [updated, updatedFree] = await Promise.all([
        fetchFeedPosts(currentUserId),
        fetchFreePosts(currentUserId),
      ]);
      setPosts(updated);
      cachedPosts = updated;
      setFreePosts(updatedFree);
      cachedFreePosts = updatedFree;
      const wasActive = isChallenge;
      await recheckChallengeStatus(currentUserId);
      getStreak(currentUserId).then(({ current }) => setStreak(current));
      if (wasActive) {
        setShowCompletion(true);
        setTimeout(() => setShowCompletion(false), 2500);
      }
      resetComposer();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Post-upload refresh failed:", msg);
      setPostError("refresh failed: " + msg);
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

  const handleDeleteComment = async (postId: string, commentId: string) => {
    try {
      await deleteComment(commentId);
      setPosts((cur) => cur.map((p) => p.id !== postId ? p : {
        ...p, comments: p.comments.filter((c) => c.id !== commentId),
      }));
    } catch (err) {
      console.error("Failed to delete comment:", err);
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
        padding: "0 16px",
        height: "53px",
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
        {challengeTimer ? (
          <p style={{ margin: 0, fontSize: "17px", fontWeight: 700, letterSpacing: "0.04em", color: "#4a7c59", fontVariantNumeric: "tabular-nums" }}>
            {challengeTimer}
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#000" }}>
            LOG<span style={{ color: "#4a7c59" }}>OFF</span>
          </p>
        )}
        <span style={{ position: "absolute", right: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => { setTestFail(true); setFailDismissedState(false); }}
            style={{ fontSize: "10px", color: "#bbb", background: "none", border: "1px solid #ddd", borderRadius: "4px", padding: "2px 6px", cursor: "pointer" }}
          >fail</button>
          <button
            type="button"
            onClick={() => { setTestEod(true); setEodDismissed(false); }}
            style={{ fontSize: "10px", color: "#bbb", background: "none", border: "1px solid #ddd", borderRadius: "4px", padding: "2px 6px", cursor: "pointer" }}
          >eod</button>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#000" }}>{streak} 🔥</span>
        </span>
      </header>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e5e5e5" }}>
        {(["challenge", "free"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: "12px 0",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid #000" : "2px solid transparent",
              color: activeTab === tab ? "#000" : "#aaa",
              cursor: "pointer",
              marginBottom: "-1px",
            }}
          >
            {tab === "challenge" ? "challenge" : challengeTimer ? "map" : "log"}
          </button>
        ))}
      </div>

      {activeTab === "challenge" ? (
        <section style={{ display: "grid", gap: 0 }}>
          {loading && posts.length === 0 ? (
            <p style={{ textAlign: "center", color: "#999", fontSize: "14px", padding: "48px 0" }}>Loading...</p>
          ) : posts.length === 0 ? (
            <p style={{ textAlign: "center", color: "#999", fontSize: "14px", padding: "48px 0" }}>No challenge posts yet. Go outside and share!</p>
          ) : (
            posts.map((post) => (
              <FeedPost
                key={post.id}
                post={post}
                currentUsername={currentUsername}
                currentUserId={currentUserId ?? ""}
                onToggleLike={handleToggleLike}
                onAddComment={handleAddComment}
                onDeletePost={handleDeletePost}
                onDeleteComment={handleDeleteComment}
              />
            ))
          )}
        </section>
      ) : challengeTimer ? (
        <FriendsMap currentUserId={currentUserId ?? ""} />
      ) : (
        <FreePostGrid posts={freePosts} onTap={setExpandedFreePost} />
      )}

      <UploadModal
        preview={previewImage}
        caption={caption}
        onCaptionChange={setCaption}
        onClose={resetComposer}
        onSubmit={handleSubmitPost}
        posting={posting}
        error={postError}
      />

      <BottomNav fileInputRef={fileInputRef} handlePhotoChange={handlePhotoChange} cameraOnly={!!challengeTimer} />

      {/* Challenge fail overlay */}
      {challengeFailed && !failDismissed && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.88)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "20px",
          padding: "32px",
        }}>
          <style>{`
            @keyframes shakeX {
              0%, 100% { transform: translateX(0); }
              20% { transform: translateX(-8px); }
              40% { transform: translateX(8px); }
              60% { transform: translateX(-6px); }
              80% { transform: translateX(6px); }
            }
          `}</style>
          <svg
            width="52" height="52" viewBox="0 0 24 24"
            fill="none" stroke="#e53935" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: "shakeX 0.6s ease" }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p style={{ margin: 0, color: "#fff", fontSize: "22px", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center" }}>
            you didn&apos;t log off
          </p>
          <p style={{ margin: 0, color: "#888", fontSize: "14px", textAlign: "center", lineHeight: 1.5, maxWidth: "260px" }}>
            the window closed before you posted. get outside next time.
          </p>
          <button
            type="button"
            onClick={dismissFail}
            style={{
              marginTop: "8px",
              border: "1px solid #333",
              background: "transparent",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 700,
              padding: "12px 32px",
              borderRadius: "24px",
              cursor: "pointer",
              letterSpacing: "0.06em",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            ok
          </button>
        </div>
      )}

      {/* End-of-day summary overlay */}
      {showEod && eodData && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,0.92)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "0",
          padding: "32px 24px",
          overflowY: "auto",
        }}>
          <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#555" }}>
            today&apos;s log
          </p>

          {eodData.didntMakeIt.length > 0 && (
            <div style={{ width: "100%", maxWidth: "320px", marginTop: "24px" }}>
              <p style={{ margin: "0 0 12px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#666" }}>
                didn&apos;t make it
              </p>
              {eodData.didntMakeIt.map((f) => (
                <div key={f.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                  <span style={{ color: "#fff", fontSize: "15px", fontWeight: 600 }}>@{f.username}</span>
                  <span style={{ color: "#555", fontSize: "13px" }}>{f.missedThisMonth} missed this month</span>
                </div>
              ))}
            </div>
          )}

          {eodData.onFire.length > 0 && (
            <div style={{ width: "100%", maxWidth: "320px", marginTop: "28px" }}>
              <p style={{ margin: "0 0 12px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#666" }}>
                on fire 🔥
              </p>
              {eodData.onFire.map((f) => (
                <div key={f.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                  <span style={{ color: "#fff", fontSize: "15px", fontWeight: 600 }}>@{f.username}</span>
                  <span style={{ color: "#e8a838", fontSize: "13px", fontWeight: 700 }}>{f.streak} day streak</span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={dismissEod}
            style={{
              marginTop: "32px",
              border: "1px solid #333",
              background: "transparent",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 700,
              padding: "12px 32px",
              borderRadius: "24px",
              cursor: "pointer",
              letterSpacing: "0.06em",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            ok
          </button>
        </div>
      )}

      {/* Free post expanded view */}
      {expandedFreePost && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.92)", overflowY: "auto" }}
          onClick={() => setExpandedFreePost(null)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", marginTop: "48px" }}>
            <FeedPost
              post={expandedFreePost}
              currentUsername={currentUsername}
              currentUserId={currentUserId ?? ""}
              onToggleLike={handleToggleLike}
              onAddComment={handleAddComment}
              onDeletePost={(id) => { handleDeletePost(id); setExpandedFreePost(null); }}
              onDeleteComment={handleDeleteComment}
            />
          </div>
          <button
            type="button"
            onClick={() => setExpandedFreePost(null)}
            style={{ position: "fixed", top: "16px", right: "16px", background: "none", border: "none", color: "#fff", fontSize: "28px", cursor: "pointer", lineHeight: 1 }}
          >×</button>
        </div>
      )}

      {/* Challenge completion overlay */}
      {showCompletion && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(74, 124, 89, 0.92)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "16px",
          animation: "fadeOut 2.5s ease forwards",
        }}>
          <style>{`
            @keyframes fadeOut {
              0% { opacity: 1; }
              70% { opacity: 1; }
              100% { opacity: 0; }
            }
            @keyframes drawTick {
              from { stroke-dashoffset: 30; }
              to { stroke-dashoffset: 0; }
            }
          `}</style>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline
              points="4 12 9 17 20 6"
              strokeDasharray="30"
              strokeDashoffset="30"
              style={{ animation: "drawTick 0.8s ease forwards" }}
            />
          </svg>
          <p style={{ margin: 0, color: "#fff", fontSize: "15px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            logged off
          </p>
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return <HomeInner />;
}
