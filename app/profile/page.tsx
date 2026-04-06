"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "../Avatar";
import BottomNav from "../BottomNav";
import UploadModal from "../UploadModal";
import type { Post } from "../types";
import { supabase } from "../../lib/supabase";
import { signOut } from "../../lib/auth";
import { fetchPosts, uploadPhoto, createPost } from "../../lib/posts";
import { fetchProfile, updateProfile, uploadAvatar, removeAvatar, updateNotificationPrefs, type NotificationPrefs } from "../../lib/profile";
import { fetchCalendarPosts, type CalendarPost } from "../../lib/posts";
import { registerAndSubscribe } from "../../lib/notifications";
import ProfileCalendar from "../ProfileCalendar";
import { useChallengeTimer } from "../../lib/useChallengeTimer";
import { getFriendsCount, getPendingRequests, acceptFollow, denyFollow } from "../../lib/follows";
import { getStreak } from "../../lib/streak";

// Module-level cache to avoid white flash on tab switch
let cachedProfile: { name: string; displayName: string | null; bio: string; joinDate: string; avatarUrl: string | null } | null = null;
let cachedPosts: Post[] = [];
let cachedUserId: string | null = null;
let cachedFriendsCount = 0;
let cachedCurrentStreak = 0;
let cachedBestStreak = 0;

export default function ProfilePage() {
  const [posts, setPosts] = useState<Post[]>(cachedPosts);
  const [currentUserId, setCurrentUserId] = useState<string | null>(cachedUserId);
  const [name, setName] = useState(cachedProfile?.name ?? "");
  const [bio, setBio] = useState(cachedProfile?.bio ?? "");
  const [displayName, setDisplayName] = useState<string | null>(cachedProfile?.displayName ?? null);
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [joinDate, setJoinDate] = useState(cachedProfile?.joinDate ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(cachedProfile?.avatarUrl ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [loading, setLoading] = useState(cachedProfile === null);
  const [friendsCount, setFriendsCount] = useState(cachedFriendsCount);
  const [currentStreak, setCurrentStreak] = useState(cachedCurrentStreak);
  const [bestStreak, setBestStreak] = useState(cachedBestStreak);
  const [pendingRequests, setPendingRequests] = useState<{ id: string; username: string }[]>([]);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [testPushStatus, setTestPushStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [endChallengeStatus, setEndChallengeStatus] = useState<"idle" | "ending" | "done" | "error">("idle");
  const [notifStatus, setNotifStatus] = useState<"unknown" | "granted" | "denied" | "enabling">("unknown");
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({ challenge: true, social: true, dms: true });
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const bioInputRef = useRef<HTMLInputElement | null>(null);
  const displayNameInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileObjectRef = useRef<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [expandedPost, setExpandedPost] = useState<Post | null>(null);
  const [showUpdates, setShowUpdates] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarPosts, setCalendarPosts] = useState<CalendarPost[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const challengeTimer = useChallengeTimer(currentUserId);

  // Load user + posts
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setCurrentUserId(user.id);
      cachedUserId = user.id;
      try {
        const [profile, userPosts, friends, requests, streak] = await Promise.all([
          fetchProfile(user.id),
          fetchPosts(user.id, user.id, true),
          getFriendsCount(user.id),
          getPendingRequests(user.id),
          getStreak(user.id),
        ]);
        setName(profile.username);
        setDisplayName(profile.displayName);
        setBio(profile.bio);
        setJoinDate(profile.joinDate);
        setAvatarUrl(profile.avatarUrl);
        // Load notification prefs from DB if available
        if (supabase) {
          const { data: prefsData } = await supabase.from("users").select("notification_prefs").eq("id", user.id).single();
          if (prefsData?.notification_prefs) setNotifPrefs(prefsData.notification_prefs as NotificationPrefs);
        }
        setPosts(userPosts);
        setFriendsCount(friends);
        setPendingRequests(requests);
        setCurrentStreak(streak.current);
        setBestStreak(streak.best);
        cachedFriendsCount = friends;
        cachedCurrentStreak = streak.current;
        cachedBestStreak = streak.best;
        cachedProfile = { name: profile.username, displayName: profile.displayName, bio: profile.bio, joinDate: profile.joinDate, avatarUrl: profile.avatarUrl };
        cachedPosts = userPosts;
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  useEffect(() => {
    if (editingBio) bioInputRef.current?.focus();
  }, [editingBio]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(currentUserId, file);
      setAvatarUrl(url);
      if (cachedProfile) cachedProfile = { ...cachedProfile, avatarUrl: url };
    } catch {}
    setAvatarUploading(false);
  };

  const saveName = async (value: string) => {
    const trimmed = value.trim().replace(/\s+/g, "").toLowerCase() || name;
    setName(trimmed);
    setEditingName(false);
    if (currentUserId) {
      try { await updateProfile(currentUserId, { username: trimmed }); } catch {}
    }
  };

  const saveDisplayName = async (value: string) => {
    const trimmed = value.trim() || null;
    setDisplayName(trimmed);
    setEditingDisplayName(false);
    if (currentUserId) {
      try { await updateProfile(currentUserId, { display_name: trimmed }); } catch {}
    }
    if (cachedProfile) cachedProfile = { ...cachedProfile, displayName: trimmed };
  };

  const saveBio = async (value: string) => {
    const trimmed = value.trim();
    setBio(trimmed);
    setEditingBio(false);
    if (currentUserId) {
      try { await updateProfile(currentUserId, { bio: trimmed }); } catch {}
    }
  };

  // Check notification permission on mount; auto-subscribe if already granted
  useEffect(() => {
    if (!("Notification" in window)) return;
    const permission = Notification.permission as "granted" | "denied" | "default";
    setNotifStatus(permission === "default" ? "unknown" : permission);
    if (permission === "granted" && currentUserId) {
      registerAndSubscribe(currentUserId).then(({ ok }) => {
        if (ok) localStorage.setItem("push_subscribed", "1");
      });
    }
  }, [currentUserId]);

  const enableNotifications = async () => {
    if (!currentUserId) return;
    setNotifStatus("enabling");
    const { ok } = await registerAndSubscribe(currentUserId);
    if (ok) {
      setNotifStatus("granted");
      localStorage.setItem("push_subscribed", "1");
    } else {
      setNotifStatus(("Notification" in window ? Notification.permission : "denied") as "granted" | "denied" | "unknown");
    }
  };

  const endChallenge = async () => {
    setEndChallengeStatus("ending");
    try {
      const res = await fetch("/api/end-challenge", { method: "POST" });
      if (!res.ok) throw new Error();
      setEndChallengeStatus("done");
      setTimeout(() => setEndChallengeStatus("idle"), 3000);
    } catch {
      setEndChallengeStatus("error");
      setTimeout(() => setEndChallengeStatus("idle"), 3000);
    }
  };

  const sendTestPush = async () => {
    if (!currentUserId) return;
    setTestPushStatus("sending");
    try {
      const res = await fetch("/api/test-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }
      setTestPushStatus("sent");
      setTimeout(() => setTestPushStatus("idle"), 4000);
    } catch (err) {
      console.error(err);
      setTestPushStatus("error");
      setTimeout(() => setTestPushStatus("idle"), 4000);
    }
  };

  const openCalendar = async () => {
    setShowCalendar(true);
    if (calendarPosts.length === 0 && currentUserId) {
      setCalendarLoading(true);
      try {
        const p = await fetchCalendarPosts(currentUserId);
        setCalendarPosts(p);
      } catch (err) {
        console.error(err);
      } finally {
        setCalendarLoading(false);
      }
    }
  };

  const saveNotifPref = async (key: keyof NotificationPrefs, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    if (currentUserId) {
      try { await updateNotificationPrefs(currentUserId, updated); } catch {}
    }
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
      const isChallenge = !!challengeTimer;
      await createPost(currentUserId, imageUrl, caption.trim() || (isChallenge ? "Went outside today." : " "), isChallenge);
      // Small delay to ensure DB write is committed before refetching
      await new Promise((r) => setTimeout(r, 600));
      const updated = await fetchPosts(currentUserId, currentUserId);
      setPosts(updated);
      cachedPosts = updated;
      resetComposer();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPostError(msg);
    } finally {
      setPosting(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#fff", paddingBottom: "80px" }}>
      {/* Header */}
      <header style={{
        padding: "0 16px",
        height: "53px",
        borderBottom: "1px solid #e5e5e5",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
      }}>
        <button
          onClick={() => setShowSettings(true)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <p style={{ margin: 0, fontSize: challengeTimer ? "17px" : "15px", fontWeight: 700, letterSpacing: challengeTimer ? "0.04em" : "0.08em", color: challengeTimer ? "#4a7c59" : "#000", fontVariantNumeric: "tabular-nums", position: "absolute", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
          {challengeTimer ?? (name ? `@${name}` : "")}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <button
          onClick={openCalendar}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", minWidth: "36px", minHeight: "44px" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
        <button
          onClick={() => setShowUpdates(true)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, position: "relative", display: "flex", alignItems: "center" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {pendingRequests.length > 0 && (
            <span style={{
              position: "absolute", top: "-4px", right: "-4px",
              background: "#e53935", color: "#fff",
              borderRadius: "999px", fontSize: "10px", fontWeight: 700,
              minWidth: "16px", height: "16px",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 4px",
            }}>
              {pendingRequests.length}
            </span>
          )}
        </button>
        </div>
      </header>

      {/* Profile info */}
      {loading ? null : <div style={{ padding: "24px 20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <div style={{ position: "relative", cursor: "pointer" }} onClick={() => avatarUploading ? null : setShowAvatarOptions(true)}>
          <Avatar name={name} size={80} avatarUrl={avatarUrl} />
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "rgba(0,0,0,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {avatarUploading ? (
              <span style={{ color: "#fff", fontSize: "11px", fontWeight: 700 }}>...</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            )}
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
        </div>

        {/* Display name */}
        {editingDisplayName ? (
          <input
            ref={displayNameInputRef}
            defaultValue={displayName ?? ""}
            placeholder="your real name..."
            autoFocus
            onBlur={(e) => saveDisplayName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveDisplayName(e.currentTarget.value); }}
            style={{
              fontSize: "18px", fontWeight: 700, border: "none", borderBottom: "1.5px solid #000",
              outline: "none", textAlign: "center", background: "transparent", width: "200px",
            }}
          />
        ) : (
          <button onClick={() => setEditingDisplayName(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: displayName ? "#000" : "#bbb" }}>
              {displayName || "add your name..."}
            </p>
          </button>
        )}

        {/* Username — tap to edit */}
        {editingName ? (
          <input
            ref={nameInputRef}
            defaultValue={name}
            onBlur={(e) => saveName(e.target.value)}
            onKeyDown={(e) => { if (e.key === " ") e.preventDefault(); if (e.key === "Enter") saveName(e.currentTarget.value); }}
            style={{
              fontSize: "13px", fontWeight: 600, border: "none", borderBottom: "1px solid #ccc",
              outline: "none", textAlign: "center", background: "transparent", width: "160px", color: "#666",
            }}
          />
        ) : (
          <button onClick={() => setEditingName(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#aaa" }}>@{name}</p>
          </button>
        )}

        {/* Bio */}
        {editingBio ? (
          <input
            ref={bioInputRef}
            defaultValue={bio}
            placeholder="add a bio..."
            onBlur={(e) => saveBio(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveBio(e.currentTarget.value); }}
            style={{
              fontSize: "13px", color: "#444", border: "none", borderBottom: "1px solid #ccc",
              outline: "none", textAlign: "center", background: "transparent", width: "240px",
            }}
          />
        ) : (
          <button
            onClick={() => setEditingBio(true)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <p style={{ margin: 0, fontSize: "13px", color: bio ? "#444" : "#aaa" }}>
              {bio || "add a bio..."}
            </p>
          </button>
        )}

        {joinDate && (
          <p style={{ margin: 0, fontSize: "12px", color: "#999" }}>joined {joinDate}</p>
        )}

      </div>}

      {/* Stats */}
      {!loading && <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        borderTop: "1px solid #e5e5e5",
        borderBottom: "1px solid #e5e5e5",
        margin: "0 0 2px",
      }}>
        {[
          { label: "posts", value: loading ? "—" : posts.length },
          { label: "friends", value: friendsCount },
          { label: "streak", value: currentStreak },
          { label: "best", value: bestStreak },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: "14px 0", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#000" }}>{value}</p>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#999", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
          </div>
        ))}
      </div>}

      {/* Photo grid */}
      {!loading && (posts.length === 0 ? (
        <div style={{ padding: "48px 20px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "#aaa" }}>no posts yet. go outside!</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px" }}>
          {posts.map((post) => (
            <img
              key={post.id}
              src={post.image}
              alt={post.caption}
              onClick={() => setExpandedPost(post)}
              style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block", cursor: "pointer" }}
            />
          ))}
        </div>
      ))}

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

      {/* Settings panel */}
      {showSettings && (
        <div onClick={() => setShowSettings(false)} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "#fff", borderRadius: "16px 16px 0 0",
            padding: "0 0 40px", maxHeight: "70vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #e5e5e5" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>settings</span>
              <button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#999", lineHeight: 1, padding: 0 }}>×</button>
            </div>

            {/* Notifications */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0" }}>
              <p style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999" }}>notifications</p>
              {notifStatus !== "granted" ? (
                <button
                  onClick={enableNotifications}
                  disabled={notifStatus === "enabling" || notifStatus === "denied"}
                  style={{
                    background: "#000", color: "#fff", border: "none",
                    borderRadius: "999px", padding: "10px 24px",
                    fontSize: "13px", fontWeight: 700, cursor: notifStatus === "denied" ? "not-allowed" : "pointer",
                    letterSpacing: "0.04em", opacity: notifStatus === "denied" ? 0.5 : 1,
                  }}
                >
                  {notifStatus === "enabling" ? "enabling..." : notifStatus === "denied" ? "blocked. check phone settings" : "enable notifications"}
                </button>
              ) : (
                <button
                  onClick={sendTestPush}
                  disabled={testPushStatus === "sending"}
                  style={{
                    background: "transparent", border: "1px solid #e5e5e5",
                    borderRadius: "999px", padding: "8px 18px",
                    fontSize: "12px", fontWeight: 600, cursor: "pointer",
                    color: testPushStatus === "sent" ? "#4a7c59" : testPushStatus === "error" ? "#e53935" : "#999",
                  }}
                >
                  {testPushStatus === "sending" ? "sending..." : testPushStatus === "sent" ? "✓ check your phone" : testPushStatus === "error" ? "⚠ not found" : "test notification"}
                </button>
              )}
              {/* Notification prefs toggles */}
              {notifStatus === "granted" && (
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "0" }}>
                  {([
                    { key: "challenge" as const, label: "Daily challenge" },
                    { key: "social" as const, label: "Likes & comments" },
                    { key: "dms" as const, label: "Direct messages" },
                  ] as const).map(({ key, label }, i, arr) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#000" }}>{label}</p>
                      <button
                        type="button"
                        onClick={() => saveNotifPref(key, !notifPrefs[key])}
                        style={{ width: "40px", height: "24px", borderRadius: "12px", background: notifPrefs[key] ? "#000" : "#ccc", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s ease", flexShrink: 0 }}
                      >
                        <div style={{ position: "absolute", top: "2px", left: notifPrefs[key] ? "18px" : "2px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", transition: "left 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dev: end challenge window */}
            <div style={{ padding: "16px 20px" }}>
              <button
                onClick={endChallenge}
                disabled={endChallengeStatus === "ending"}
                style={{
                  background: "transparent", border: "1px solid #e5e5e5",
                  borderRadius: "999px", padding: "8px 18px",
                  fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  color: endChallengeStatus === "done" ? "#4a7c59" : endChallengeStatus === "error" ? "#e53935" : "#999",
                }}
              >
                {endChallengeStatus === "ending" ? "ending..." : endChallengeStatus === "done" ? "✓ challenge ended" : endChallengeStatus === "error" ? "⚠ failed" : "end challenge (dev)"}
              </button>
            </div>

            {/* Log out */}
            <div style={{ padding: "16px 20px" }}>
              <button
                onClick={async () => { try { await signOut(); } catch {} }}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontSize: "15px", fontWeight: 600, color: "#e53935",
                }}
              >
                log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Updates panel */}
      {showUpdates && (
        <div
          onClick={() => setShowUpdates(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "#fff", borderRadius: "16px 16px 0 0",
              padding: "0 0 40px",
              maxHeight: "70vh", overflowY: "auto",
            }}
          >
            {/* Panel header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #e5e5e5" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>updates</span>
              <button onClick={() => setShowUpdates(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#999", lineHeight: 1, padding: 0 }}>×</button>
            </div>

            {/* Friend requests */}
            {pendingRequests.length === 0 ? (
              <p style={{ textAlign: "center", color: "#aaa", fontSize: "14px", margin: "40px 0" }}>no new updates</p>
            ) : (
              <div>
                <p style={{ margin: "14px 20px 6px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999" }}>friend requests</p>
                {pendingRequests.map((req) => (
                  <div key={req.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600 }}>{req.username}</span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={async () => {
                          if (!currentUserId) return;
                          await acceptFollow(req.id, currentUserId);
                          setPendingRequests((r) => r.filter((x) => x.id !== req.id));
                          setFriendsCount((c) => c + 1);
                        }}
                        style={{ background: "#000", color: "#fff", border: "none", borderRadius: "999px", padding: "7px 16px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                      >
                        accept
                      </button>
                      <button
                        onClick={async () => {
                          if (!currentUserId) return;
                          await denyFollow(req.id, currentUserId);
                          setPendingRequests((r) => r.filter((x) => x.id !== req.id));
                        }}
                        style={{ background: "transparent", color: "#666", border: "1px solid #e5e5e5", borderRadius: "999px", padding: "7px 16px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                      >
                        deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post lightbox */}
      {expandedPost && (
        <div
          onClick={() => setExpandedPost(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.85)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "12px", padding: "24px",
          }}
        >
          <img
            src={expandedPost.image}
            alt={expandedPost.caption}
            style={{ width: "100%", maxWidth: "480px", borderRadius: "4px", objectFit: "contain", maxHeight: "70vh" }}
          />
          {expandedPost.caption && (
            <p style={{ margin: 0, color: "#fff", fontSize: "14px", textAlign: "center", opacity: 0.85 }}>
              {expandedPost.caption}
            </p>
          )}
        </div>
      )}
      {/* Avatar options sheet */}
      {showAvatarOptions && (
        <div onClick={() => setShowAvatarOptions(false)} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "#fff", borderRadius: "16px 16px 0 0",
            padding: "0 0 40px",
            animation: "slideUpSheet 0.28s cubic-bezier(0.32,0.72,0,1)",
          }}>
            <style>{`@keyframes slideUpSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            <button
              onClick={() => { setShowAvatarOptions(false); avatarInputRef.current?.click(); }}
              style={{ width: "100%", padding: "18px 20px", background: "none", border: "none", borderBottom: "1px solid #f0f0f0", fontSize: "15px", fontWeight: 600, cursor: "pointer", textAlign: "left" }}
            >
              change photo
            </button>
            {avatarUrl && (
              <button
                onClick={async () => {
                  setShowAvatarOptions(false);
                  if (!currentUserId) return;
                  try { await removeAvatar(currentUserId); } catch {}
                  setAvatarUrl(null);
                  if (cachedProfile) cachedProfile = { ...cachedProfile, avatarUrl: null };
                }}
                style={{ width: "100%", padding: "18px 20px", background: "none", border: "none", borderBottom: "1px solid #f0f0f0", fontSize: "15px", fontWeight: 600, cursor: "pointer", textAlign: "left", color: "#e53935" }}
              >
                remove photo
              </button>
            )}
            <button
              onClick={() => setShowAvatarOptions(false)}
              style={{ width: "100%", padding: "18px 20px", background: "none", border: "none", fontSize: "15px", cursor: "pointer", textAlign: "left", color: "#aaa" }}
            >
              cancel
            </button>
          </div>
        </div>
      )}
      {showCalendar && (
        <ProfileCalendar
          posts={calendarLoading ? [] : calendarPosts}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </main>
  );
}
