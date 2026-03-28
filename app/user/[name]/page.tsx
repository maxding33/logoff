"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Avatar from "../../Avatar";
import type { Post } from "../../types";

const STARTER_POSTS: Post[] = [
  {
    id: 1,
    user: "Maya",
    location: "Primrose Hill",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    caption: "Morning air, little walk, head finally clear.",
    createdAt: "2h ago",
    liked: false,
    likes: 18,
    comments: [],
  },
  {
    id: 2,
    user: "Jordan",
    location: "Hampstead Heath",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    caption: "",
    createdAt: "4h ago",
    liked: false,
    likes: 27,
    comments: [],
  },
  {
    id: 3,
    user: "Aisha",
    location: "Richmond Park",
    image: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?auto=format&fit=crop&w=1200&q=80",
    caption: "Golden light and an actually offline afternoon.",
    createdAt: "6h ago",
    liked: false,
    likes: 34,
    comments: [],
  },
];

export default function UserProfilePage() {
  const params = useParams();
  const name = decodeURIComponent(params.name as string);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("posts");
      const localPosts: Post[] = stored ? JSON.parse(stored) : [];
      const allPosts = [...STARTER_POSTS, ...localPosts];
      setPosts(allPosts.filter((p) => p.user === name));
    } catch {
      setPosts(STARTER_POSTS.filter((p) => p.user === name));
    }
  }, [name]);

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
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#000", textDecoration: "none" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {name}
        </span>
      </header>

      {/* Profile info */}
      <div style={{ padding: "24px 16px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", borderBottom: "1px solid #e5e5e5" }}>
        <Avatar name={name} size={72} />
        <p style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>{name}</p>
        <p style={{ margin: 0, fontSize: "13px", color: "#999" }}>{posts.length} {posts.length === 1 ? "post" : "posts"}</p>
      </div>

      {/* Photo grid */}
      {posts.length === 0 ? (
        <p style={{ textAlign: "center", color: "#999", fontSize: "14px", marginTop: "40px" }}>no posts yet</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px" }}>
          {posts.map((post) => (
            <img
              key={post.id}
              src={post.image}
              alt={post.caption || `${name} post`}
              style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
