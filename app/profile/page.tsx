"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "../Avatar";
import BottomNav from "../BottomNav";
import UploadModal from "../UploadModal";
import type { Post } from "../types";
import { supabase } from "../../lib/supabase";
import { fetchPosts, uploadPhoto, createPost } from "../../lib/posts";
import { fetchProfile, updateProfile, uploadAvatar, removeAvatar } from "../../lib/profile";
import { registerAndSubscribe } from "../../lib/notifications";
import { useChallengeTimer } from "../../lib/useChallengeTimer";
import { getFriendsCount, getPendingRequests, acceptFollow, denyFollow } from "../../lib/follows";

// Module-level cache to avoid white flash on tab switch
let cachedProfile: { name: string; displayName: string | null; bio: string; joinDate: string; avatarUrl: string | null } | null = null;
let cachedPosts: Post[] = [];
let cachedUserId: string | null = null;

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
  const [friendsCount, setFriendsCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState<{ id: string; username: string }[]>([]);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [testPushStatus, setTestPushStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [notifStatus, setNotifStatus] = useState<"unknown" | "granted" | "denied" | "enabling">("unknown");
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const bioInputRef = useRef<HTMLInputElement | null>(null);
  const displayNameInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileObjectRef = useRef<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [expandedPost, setExpandedPost] = useState<Post | null>(null);
  const [showUpdates, setShowUpdates] = useState(false);
  const challengeTimer = useChallengeTimer(currentUserId);

  // Load user + posts
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setCurrentUserId(user.id);
      cachedUserId = user.id;
      try {
        const [profile, userPosts, friends, requests] = await Promise.all([
          fetchProfile(user.id),
          fetchPosts(user.id, user.id),
          getFriendsCount(user.id),
          getPendingRequests(user.id),
        ]);
        setName(profile.username);
        setDisplayName(profile.displayName);
        setBio(profile.bio);
        setJoinDate(profile.joinDate);
        setAvatarUrl(profile.avatarUrl);
        setPosts(userPosts);
        setFriendsCount(friends);
        setPendingRequests(requests);
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
    const trimmed = value.trim().replace(/\s+/g, "") || name;
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
        <div style={{ width: 22 }} />
        <p style={{ margin: 0, fontSize: challengeTimer ? "17px" : "13px", fontWeight: 700, letterSpacing: challengeTimer ? "0.04em" : "0.08em", color: challengeTimer ? "#4a7c59" : "#000", fontVariantNumeric: "tabular-nums", position: "absolute", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
          {challengeTimer ?? (name ? `@${name}` : "")}
        </p>
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
      </header>

      {/* Profile info */}
      {loading ? null : <div style={{ padding: "24px 20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
        <div style={{ position: "relative", cursor: "pointer" }} onClick={() => avatarInputRef.current?.click()}>
          <Avatar name={name} size={80} avatarUrl={avatarUrl} />
          {(!avatarUrl || avatarUploading) && (
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "rgba(0,0,0,0.25)",
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
          )}
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
        </div>
        {avatarUrl && (
          <button
            onClick={async () => {
              if (!currentUserId) return;
              try { await removeAvatar(currentUserId); } catch {}
              setAvatarUrl(null);
              if (cachedProfile) cachedProfile = { ...cachedProfile, avatarUrl: null };
            }}
            style={{ background: "none", border: "none", color: "#999", fontSize: "12px", cursor: "pointer", padding: 0 }}
          >
            remove photo
          </button>
        )}
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
            <p style={{ margin: 0, fontSize: "12px", color: "#aaa" }}>tap to change username</p>
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

        {/* Notification buttons */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", width: "100%" }}>
{notifStatus !== "granted" && (
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
              {notifStatus === "enabling" ? "enabling..." :
               notifStatus === "denied" ? "notifications blocked — check phone settings" :
               "enable notifications"}
            </button>
          )}
          {notifStatus === "granted" && (
            <button
              onClick={sendTestPush}
              disabled={testPushStatus === "sending"}
              style={{
                background: "transparent", border: "1px solid #e5e5e5",
                borderRadius: "999px", padding: "8px 18px",
                fontSize: "12px", fontWeight: 600, cursor: testPushStatus === "sending" ? "not-allowed" : "pointer",
                color: testPushStatus === "sent" ? "#4a7c59" : testPushStatus === "error" ? "#e53935" : "#999",
                letterSpacing: "0.04em",
              }}
            >
              {testPushStatus === "sending" ? "sending..." :
               testPushStatus === "sent" ? "✓ check your phone" :
               testPushStatus === "error" ? "⚠ subscription not found" :
               "test notification"}
            </button>
          )}
        </div>
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
          { label: "streak", value: 0 },
          { label: "best", value: 0 },
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
          <p style={{ margin: 0, fontSize: "14px", color: "#aaa" }}>no posts yet — go outside!</p>
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

      <BottomNav fileInputRef={fileInputRef} handlePhotoChange={handlePhotoChange} />

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
    </main>
  );
}
