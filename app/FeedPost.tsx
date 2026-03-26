"use client";

import { Post } from "./types";

type FeedPostProps = {
  post: Post;
};

export default function FeedPost({ post }: FeedPostProps) {
  return (
    <article
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "24px",
        overflow: "hidden",
        boxShadow: "0 14px 30px rgba(15,23,42,0.08)",
        border: "1px solid rgba(226,232,240,0.9)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "999px",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "14px",
              flexShrink: 0,
            }}
          >
            {post.user.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>
              {post.user}
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "13px",
                color: "#64748b",
              }}
            >
              {post.location}
            </p>
          </div>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            color: "#94a3b8",
            fontWeight: 600,
          }}
        >
          {post.createdAt}
        </p>
      </div>

      <img
        src={post.image}
        alt={post.caption || `${post.user} post`}
        style={{
          display: "block",
          width: "100%",
          aspectRatio: "4 / 5",
          objectFit: "cover",
          backgroundColor: "#e2e8f0",
        }}
      />

      <div style={{ padding: "14px 16px 18px" }}>
        <div
          style={{
            display: "flex",
            gap: "14px",
            fontSize: "22px",
            marginBottom: "10px",
          }}
          aria-hidden="true"
        >
          <span>♡</span>
          <span>💬</span>
          <span>✈️</span>
        </div>
        <p style={{ margin: 0, color: "#0f172a", lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700 }}>{post.user}</span> {post.caption}
        </p>
      </div>
    </article>
  );
}