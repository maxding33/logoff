"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import BottomNav from "./BottomNav";
import FeedPost from "./FeedPost";
import UploadModal from "./UploadModal";
import type { Post } from "./types";
import { supabase } from "../lib/supabase";
import { fetchFeedPosts, fetchFreePosts, uploadPhoto, preparePhoto, createPost, toggleLike, addComment, deletePost, deleteComment } from "../lib/posts";
import FreePostGrid from "./FreePostGrid";
import FriendsMap from "./FriendsMap";
import LogReel from "./LogReel";
import GamePicker from "./GamePicker";
import ReportSheet from "./ReportSheet";
import type { ReportTarget } from "../lib/reports";
import { getStreak } from "../lib/streak";
import { useChallengeTimer, useChallengeFailed, recheckChallengeStatus, isChallengeActive } from "../lib/useChallengeTimer";
import { useEndOfDaySummary } from "../lib/useEndOfDaySummary";
import { getUnreadCount, updateLastSeen } from "../lib/messages";

// Module-level cache to avoid white flash on tab switch
let cachedPosts: Post[] = [];
let cachedFreePosts: Post[] = [];
let cachedUserId: string | null = null;
let cachedUsername = "You";

function HomeInner() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileObjectRef = useRef<File | null>(null);
  const preparedBlobRef = useRef<Blob | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [posts, setPosts] = useState<Post[]>(cachedPosts);
  const [freePosts, setFreePosts] = useState<Post[]>(cachedFreePosts);
  const [activeTab, setActiveTab] = useState<"challenge" | "free">("challenge");
  const [reelIndex, setReelIndex] = useState<number | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [streak, setStreak] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(cachedUserId);
  const [currentUsername, setCurrentUsername] = useState<string>(cachedUsername);
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(cachedPosts.length === 0);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showMapToast, setShowMapToast] = useState(false);
  const [mapTabFlash, setMapTabFlash] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);
  const challengeTimer = useChallengeTimer(currentUserId);
  const prevChallengeTimer = useRef<string | null | undefined>(undefined);
  const { failed: challengeFailedReal, failedDate } = useChallengeFailed(currentUserId);
  const [testFail, setTestFail] = useState(false);
  const [testEod, setTestEod] = useState(false);

  // Debounce the fail overlay — only show if failed stays true for 100ms
  // This eliminates any millisecond-level flash from intermediate states during startup
  const [stableChallengeFailed, setStableChallengeFailed] = useState(false);
  useEffect(() => {
    if (!challengeFailedReal) { setStableChallengeFailed(false); return; }
    const t = setTimeout(() => setStableChallengeFailed(true), 100);
    return () => clearTimeout(t);
  }, [challengeFailedReal]);

  const challengeFailed = stableChallengeFailed || testFail;

  // Persist dismissed state in localStorage keyed by failed date so it survives app close
  const failKey = testFail ? "logoff_fail_dismissed_test" : failedDate ? `logoff_fail_dismissed_${failedDate}` : null;
  // Derive synchronously — no state/effect gap that causes a one-frame flash
  const failDismissed = typeof window !== "undefined" && failKey ? localStorage.getItem(failKey) === "1" : true;
  const [, forceUpdate] = useState(0);

  const dismissFail = () => {
    if (failKey) localStorage.setItem(failKey, "1");
    forceUpdate((n) => n + 1);
  };

  // Detect challenge window opening — auto-switch to map, show toast + tab flash
  useEffect(() => {
    if (prevChallengeTimer.current === undefined) {
      prevChallengeTimer.current = challengeTimer;
      return;
    }
    if (!prevChallengeTimer.current && challengeTimer) {
      const todayKey = `logoff_map_toast_${new Date().toDateString()}`;
      if (!localStorage.getItem(todayKey)) {
        localStorage.setItem(todayKey, "1");
        setShowMapToast(true);
        setMapTabFlash(true);
        setTimeout(() => setShowMapToast(false), 3500);
        setTimeout(() => setMapTabFlash(false), 1500);
      }
    }
    prevChallengeTimer.current = challengeTimer;
  }, [challengeTimer]);

  // End-of-day summary
  const { shouldShow: eodShouldShow, summary: eodSummary } = useEndOfDaySummary(currentUserId);
  const eodKey = eodSummary ? `logoff_eod_dismissed_${eodSummary.windowDate}` : null;
  const eodDismissed = typeof window !== "undefined" && eodKey ? localStorage.getItem(eodKey) === "1" : true;
  const dismissEod = () => {
    if (eodKey) localStorage.setItem(eodKey, "1");
    forceUpdate((n) => n + 1);
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

  // Pull-to-refresh + tab-swipe state
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const pulling = useRef(false);
  const dragDirection = useRef<"horiz" | "vert" | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Non-passive touchmove listener so we can preventDefault during horizontal drags,
  // which stops vertical scroll momentum carrying over after a tab swipe.
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (dragDirection.current === "horiz") e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);
  const [pullDistance, setPullDistance] = useState(0);

  // Keep slider in sync with activeTab (e.g. when tab buttons are tapped)
  useEffect(() => {
    if (!sliderRef.current) return;
    sliderRef.current.style.transition = "transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    sliderRef.current.style.transform = `translateX(${activeTab === "challenge" ? 0 : -window.innerWidth}px)`;
  }, [activeTab]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        cachedUserId = user.id;
        currentUserIdRef.current = user.id;
        supabase!
          .from("users")
          .select("username, avatar_url")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data?.username) { setCurrentUsername(data.username); cachedUsername = data.username; }
            if (data?.avatar_url) setCurrentUserAvatarUrl(data.avatar_url as string);
          });
      }
    });
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    getStreak(currentUserId).then(({ current }) => setStreak(current));
    getUnreadCount(currentUserId).then(setUnreadMessages).catch(() => {});
    updateLastSeen(currentUserId).catch(() => {});
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

  // Realtime unread message count
  useEffect(() => {
    if (!supabase || !currentUserId) return;
    const channel = supabase
      .channel("home-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        getUnreadCount(currentUserId).then(setUnreadMessages).catch(() => {});
      })
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [currentUserId]);

  // Pull-to-refresh + fluid tab-swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    dragDirection.current = null;
    if (window.scrollY === 0) pulling.current = true;
    if (sliderRef.current) sliderRef.current.style.transition = "none";
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Lock drag direction after 5px
    if (dragDirection.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      dragDirection.current = Math.abs(dx) > Math.abs(dy) ? "horiz" : "vert";
    }

    if (dragDirection.current === "horiz" && reelIndex === null && !(challengeTimer && activeTab === "free")) {
      pulling.current = false;
      setPullDistance(0);
      const base = activeTab === "challenge" ? 0 : -window.innerWidth;
      const raw = base + dx;
      // Rubber-band at edges
      const offset = raw > 0 ? raw * 0.2 : raw < -window.innerWidth ? -window.innerWidth + (raw + window.innerWidth) * 0.2 : raw;
      if (sliderRef.current) sliderRef.current.style.transform = `translateX(${offset}px)`;
    } else if (dragDirection.current === "vert" && pulling.current) {
      const dist = Math.max(0, Math.min(80, dy));
      setPullDistance(dist);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragDirection.current === "horiz" && reelIndex === null && !(challengeTimer && activeTab === "free")) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const threshold = window.innerWidth * 0.18;
      let newTab = activeTab;
      if (dx < -threshold && activeTab === "challenge") newTab = "free";
      else if (dx > threshold && activeTab === "free") newTab = "challenge";

      if (newTab !== activeTab) {
        setActiveTab(newTab); // triggers useEffect which animates to final position
      } else if (sliderRef.current) {
        // Snap back
        sliderRef.current.style.transition = "transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        sliderRef.current.style.transform = `translateX(${activeTab === "challenge" ? 0 : -window.innerWidth}px)`;
      }
      pulling.current = false;
      setPullDistance(0);
      return;
    }

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
    setImageReady(false);
    fileObjectRef.current = null;
    preparedBlobRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    fileObjectRef.current = file;
    preparedBlobRef.current = null;
    setImageReady(false);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const dataUrl = reader.result;
        setPreviewImage(dataUrl);
        // Eagerly compress so the file is fully in memory before upload
        preparePhoto(dataUrl).then((blob) => {
          preparedBlobRef.current = blob;
          setImageReady(true);
        }).catch(() => {
          // Fallback — still allow upload attempt
          setImageReady(true);
        });
      }
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
    const blob = preparedBlobRef.current;
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

    // Step 2: upload photo (use pre-prepared blob if available)
    let imageUrl: string;
    try {
      imageUrl = await uploadPhoto(blob ?? file, currentUserId);
    } catch (err) {
      console.error("Upload failed:", err);
      setPostError("upload failed — check your connection and try again");
      setPosting(false);
      return;
    }

    // Step 3: create post
    const isChallenge = isChallengeActive();
    try {
      await createPost(currentUserId, imageUrl, caption.trim() || (isChallenge ? "Went outside today." : " "), isChallenge);
    } catch (err) {
      console.error("Create post failed:", err);
      setPostError("couldn't save post — check your connection and try again");
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
    const post = posts.find((p) => p.id === postId) ?? freePosts.find((p) => p.id === postId);
    if (!post) return;
    const update = (p: typeof post) =>
      p.id === postId ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p;
    setPosts((cur) => cur.map(update));
    setFreePosts((cur) => cur.map(update));
    try {
      await toggleLike(postId, currentUserId, post.liked);
    } catch {
      const revert = (p: typeof post) => p.id === postId ? { ...p, liked: post.liked, likes: post.likes } : p;
      setPosts((cur) => cur.map(revert));
      setFreePosts((cur) => cur.map(revert));
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (!currentUserId) return;
    try {
      const newComment = await addComment(postId, currentUserId, text, currentUsername, currentUserAvatarUrl);
      const applyComment = (cur: Post[]) =>
        cur.map((p) => p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p);
      setPosts(applyComment);
      setFreePosts(applyComment);
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    try {
      await deleteComment(commentId);
      const applyDelete = (cur: Post[]) => cur.map((p) => p.id !== postId ? p : {
        ...p, comments: p.comments.filter((c) => c.id !== commentId),
      });
      setPosts(applyDelete);
      setFreePosts(applyDelete);
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost(postId);
      setPosts((cur) => cur.filter((p) => p.id !== postId));
      setFreePosts((cur) => cur.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  return (
    <main
      ref={mainRef}
      style={{ minHeight: "100vh", background: "#ffffff", padding: "0 0 96px", overflowX: "hidden", touchAction: "pan-y" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        @keyframes toastSlideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes toastFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes tabFlash {
          0%, 100% { color: #4a7c59; }
          50% { color: #7bc47f; }
        }
      `}</style>

      {/* Map live toast */}
      {showMapToast && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 900,
          display: "flex", justifyContent: "center", padding: "12px 16px",
          pointerEvents: "none",
        }}>
          <div style={{
            background: "#4a7c59", color: "#fff",
            fontSize: "13px", fontWeight: 700,
            padding: "10px 20px", borderRadius: "24px",
            letterSpacing: "0.04em",
            animation: "toastSlideDown 0.3s ease, toastFadeOut 0.5s ease 3s forwards",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          }}>
            outdoor hour started. map is live
          </div>
        </div>
      )}

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
          position: "absolute", left: "8px", color: "#000",
          display: "flex", alignItems: "center", justifyContent: "center",
          minWidth: "52px", minHeight: "53px",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </Link>
        {challengeTimer ? (
          <p style={{ margin: 0, fontSize: "17px", fontWeight: 700, letterSpacing: "0.04em", color: "#4a7c59", fontVariantNumeric: "tabular-nums" }}>
            {challengeTimer}
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: "18px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#000" }}>
            LOG<span style={{ color: "#4a7c59" }}>OFF</span>
          </p>
        )}
        <span style={{ position: "absolute", right: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            type="button"
            onClick={() => { setTestFail(true); forceUpdate((n) => n + 1); }}
            style={{ fontSize: "10px", color: "#bbb", background: "none", border: "1px solid #ddd", borderRadius: "4px", padding: "2px 6px", cursor: "pointer" }}
          >fail</button>
          <button
            type="button"
            onClick={() => { setTestEod(true); forceUpdate((n) => n + 1); }}
            style={{ fontSize: "10px", color: "#bbb", background: "none", border: "1px solid #ddd", borderRadius: "4px", padding: "2px 6px", cursor: "pointer" }}
          >eod</button>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#000" }}>{streak} 🔥</span>
          <Link href="/messages" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", minWidth: "44px", minHeight: "53px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {unreadMessages > 0 && (
              <span style={{
                position: "absolute", top: "-4px", right: "-4px",
                background: "#e53935", color: "#fff",
                borderRadius: "999px", fontSize: "10px", fontWeight: 700,
                minWidth: "16px", height: "16px",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 4px",
              }}>{unreadMessages > 9 ? "9+" : unreadMessages}</span>
            )}
          </Link>
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
              color: tab === "free" && mapTabFlash ? "#4a7c59" : activeTab === tab ? "#000" : "#aaa",
              transition: "color 0.2s ease, border-color 0.2s ease",
              animation: tab === "free" && mapTabFlash ? "tabFlash 0.5s ease 3" : "none",
              cursor: "pointer",
              marginBottom: "-1px",
            }}
          >
            {tab === "challenge" ? "challenge" : challengeTimer ? "map" : "log"}
          </button>
        ))}
      </div>

      {/* Sliding panels */}
      <div style={{ overflow: "hidden" }}>
        <div ref={sliderRef} style={{ display: "flex", width: "200%", willChange: "transform" }}>
          {/* Panel 1 — challenge feed */}
          <div style={{ width: "50%", minWidth: 0 }}>
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
                    onReport={setReportTarget}
                  />
                ))
              )}
            </section>
          </div>
          {/* Panel 2 — log / map feed */}
          <div style={{ width: "50%", minWidth: 0 }}>
            {challengeTimer ? (
              <FriendsMap currentUserId={currentUserId ?? ""} />
            ) : (
              <FreePostGrid posts={freePosts} onTap={(post) => setReelIndex(freePosts.findIndex((p) => p.id === post.id))} />
            )}
          </div>
        </div>
      </div>

      <UploadModal
        preview={previewImage}
        caption={caption}
        onCaptionChange={setCaption}
        onClose={resetComposer}
        onSubmit={handleSubmitPost}
        posting={posting}
        error={postError}
        imageReady={imageReady}
      />

      <BottomNav
        fileInputRef={fileInputRef}
        handlePhotoChange={handlePhotoChange}
        cameraOnly={!!challengeTimer}
        onGamePress={!challengeTimer && activeTab === "challenge" ? () => setShowGamePicker(true) : undefined}
      />

      {showGamePicker && <GamePicker onClose={() => setShowGamePicker(false)} />}

      {/* Challenge fail overlay — only show after initial load to avoid flash during auth/data settling */}
      {!loading && challengeFailed && !failDismissed && (
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

      {/* Log reel viewer */}
      {reelIndex !== null && (
        <LogReel
          posts={freePosts}
          startIndex={reelIndex}
          currentUserId={currentUserId ?? ""}
          currentUsername={currentUsername}
          onClose={() => setReelIndex(null)}
          onToggleLike={handleToggleLike}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          onDeletePost={(id) => { handleDeletePost(id); setReelIndex(null); }}
          onReport={setReportTarget}
        />
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
      {reportTarget && currentUserId && (
        <ReportSheet target={reportTarget} currentUserId={currentUserId} onClose={() => setReportTarget(null)} />
      )}
    </main>
  );
}

export default function Home() {
  return <HomeInner />;
}
