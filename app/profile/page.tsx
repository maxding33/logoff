"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "../Avatar";
import BottomNav from "../BottomNav";
import UploadModal from "../UploadModal";
import type { Post } from "../types";
import { supabase } from "../../lib/supabase";
import { fetchPosts, uploadPhoto, createPost } from "../../lib/posts";
import { fetchProfile, updateProfile } from "../../lib/profile";
import { registerAndSubscribe } from "../../lib/notifications";
import { useChallengeTimer } from "../../lib/useChallengeTimer";

export default function ProfilePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [name, setName] = useState("You");
  const [bio, setBio] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [testPushStatus, setTestPushStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [notifStatus, setNotifStatus] = useState<"unknown" | "granted" | "denied" | "enabling">("unknown");
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const bioInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileObjectRef = useRef<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const challengeTimer = useChallengeTimer();

  // Load user + posts
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setCurrentUserId(user.id);
      try {
        const [profile, userPosts] = await Promise.all([
          fetchProfile(user.id),
          fetchPosts(user.id, user.id),
        ]);
        setName(profile.username);
        setBio(profile.bio);
        setJoinDate(profile.joinDate);
        setPosts(userPosts);
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

  const saveName = async (value: string) => {
    const trimmed = value.trim() || name;
    setName(trimmed);
    setEditingName(false);
    if (currentUserId) {
      try { await updateProfile(currentUserId, { username: trimmed }); } catch {}
    }
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
      const updated = await fetchPosts(currentUserId, currentUserId);
      setPosts(updated);
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
        gap: "12px",
        position: "relative",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#000", textDecoration: "none" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            profile
          </span>
        </Link>
        {challengeTimer && (
          <p style={{ margin: 0, fontSize: "17px", fontWeight: 700, letterSpacing: "0.04em", color: "#4a7c59", fontVariantNumeric: "tabular-nums", position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
            {challengeTimer}
          </p>
        )}
      </header>

      {/* Profile info */}
      <div style={{ padding: "24px 20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <Avatar name={name} size={80} />

        {/* Name */}
        {editingName ? (
          <input
            ref={nameInputRef}
            defaultValue={name}
            onBlur={(e) => saveName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveName(e.currentTarget.value); }}
            style={{
              fontSize: "18px", fontWeight: 700, border: "none", borderBottom: "1.5px solid #000",
              outline: "none", textAlign: "center", background: "transparent", width: "180px",
            }}
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <p style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#000" }}>{name}</p>
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
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        borderTop: "1px solid #e5e5e5",
        borderBottom: "1px solid #e5e5e5",
        margin: "0 0 2px",
      }}>
        {[
          { label: "posts", value: loading ? "—" : posts.length },
          { label: "friends", value: 0 },
          { label: "streak", value: 0 },
          { label: "best", value: 0 },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: "14px 0", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#000" }}>{value}</p>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#999", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Photo grid */}
      {loading ? (
        <p style={{ textAlign: "center", color: "#999", fontSize: "14px", marginTop: "40px" }}>loading...</p>
      ) : posts.length === 0 ? (
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
              style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }}
            />
          ))}
        </div>
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

      <BottomNav fileInputRef={fileInputRef} handlePhotoChange={handlePhotoChange} />
    </main>
  );
}
