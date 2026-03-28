"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "../Avatar";
import BottomNav from "../BottomNav";
import UploadModal from "../UploadModal";
import type { Post } from "../types";

export default function ProfilePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [name, setName] = useState("You");
  const [bio, setBio] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [joinDate, setJoinDate] = useState("");
  const [streak] = useState(0);
  const [bestStreak] = useState(0);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const bioInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("posts");
      if (stored) setPosts(JSON.parse(stored));
    } catch {}

    const storedName = localStorage.getItem("profile_name");
    if (storedName) setName(storedName);

    const storedBio = localStorage.getItem("profile_bio");
    if (storedBio) setBio(storedBio);

    let storedJoinDate = localStorage.getItem("profile_joinDate");
    if (!storedJoinDate) {
      storedJoinDate = new Date().toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      });
      localStorage.setItem("profile_joinDate", storedJoinDate);
    }
    setJoinDate(storedJoinDate);
  }, []);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  useEffect(() => {
    if (editingBio) bioInputRef.current?.focus();
  }, [editingBio]);

  const saveName = (value: string) => {
    const trimmed = value.trim() || "You";
    setName(trimmed);
    setEditingName(false);
    try { localStorage.setItem("profile_name", trimmed); } catch {}
  };

  const saveBio = (value: string) => {
    setBio(value.trim());
    setEditingBio(false);
    try { localStorage.setItem("profile_bio", value.trim()); } catch {}
  };

  const resetComposer = () => {
    setPreviewImage(null);
    setCaption("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPost = () => {
    if (!previewImage) return;
    const newPost: Post = {
      id: Date.now(),
      user: "You",
      location: "Outside",
      image: previewImage,
      caption: caption.trim() || "Went outside today.",
      createdAt: "Just now",
      liked: false,
      likes: 0,
      comments: [],
    };
    const updated = [newPost, ...posts];
    setPosts(updated);
    try { localStorage.setItem("posts", JSON.stringify(updated)); } catch {}
    resetComposer();
  };

  const myPosts = posts.filter((p) => p.user === "You");

  return (
    <main style={{ minHeight: "100vh", background: "#fff", paddingBottom: "80px" }}>
      {/* Header */}
      <header style={{
        padding: "14px 16px",
        borderBottom: "1px solid #e5e5e5",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", color: "#000", textDecoration: "none" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          profile
        </p>
      </header>

      {/* Profile info */}
      <div style={{ padding: "24px 20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <Avatar name="You" size={80} />

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

        <p style={{ margin: 0, fontSize: "12px", color: "#999" }}>joined {joinDate}</p>
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
          { label: "posts", value: myPosts.length },
          { label: "friends", value: 0 },
          { label: "streak", value: streak },
          { label: "best", value: bestStreak },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: "14px 0", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#000" }}>{value}</p>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#999", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Photo grid */}
      {myPosts.length === 0 ? (
        <div style={{ padding: "48px 20px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "#aaa" }}>no posts yet — go outside!</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px" }}>
          {myPosts.map((post) => (
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
      />

      <BottomNav fileInputRef={fileInputRef} handlePhotoChange={handlePhotoChange} />
    </main>
  );
}
