"use client";

import { useState } from "react";
import type { Post } from "./types";

type FeedPostProps = {
  post: Post;
  onToggleLike: (postId: number) => void;
  onAddComment: (postId: number, text: string) => void;
};

export default function FeedPost({
  post,
  onToggleLike,
  onAddComment,
}: FeedPostProps) {
  const [commentText, setCommentText] = useState("");

  const handleSubmitComment = () => {
    const trimmedComment = commentText.trim();

    if (!trimmedComment) {
      return;
    }

    onAddComment(post.id, trimmedComment);
    setCommentText("");
  };
  return (
    <article
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "24px",
        overflow: "hidden",
        boxShadow: "0 14px 30px rgba(15,23,42,0.08)",
        border: "1px solid rgba(226,232,240,0.9)",
        position: "relative",
        zIndex: 1,
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
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={() => onToggleLike(post.id)}
            aria-label={post.liked ? "Unlike post" : "Like post"}
            style={{
              border: "none",
              background: "transparent",
              padding: "11px",
              cursor: "pointer",
              fontSize: "22px",
              lineHeight: 1,
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              position: "relative",
              zIndex: 2,
            }}
          >
            {post.liked ? "❤️" : "🤍"}
          </button>
          <span aria-hidden="true">💬</span>
          <span aria-hidden="true">✈️</span>
        </div>

        <p
          style={{
            margin: "0 0 10px",
            color: "#0f172a",
            fontWeight: 700,
            fontSize: "14px",
          }}
        >
          {post.likes} {post.likes === 1 ? "like" : "likes"}
        </p>

        <p style={{ margin: "0 0 12px", color: "#0f172a", lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700 }}>{post.user}</span> {post.caption}
        </p>

        {post.comments.length > 0 && (
          <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
            {post.comments.map((comment) => (
              <p
                key={comment.id}
                style={{
                  margin: 0,
                  color: "#0f172a",
                  lineHeight: 1.45,
                  fontSize: "14px",
                }}
              >
                <span style={{ fontWeight: 700 }}>{comment.user}</span> {comment.text}
              </p>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSubmitComment();
              }
            }}
            placeholder="Add a comment..."
            style={{
              flex: 1,
              borderRadius: "999px",
              border: "1px solid #cbd5e1",
              padding: "10px 14px",
              fontSize: "14px",
              outline: "none",
              color: "#0f172a",
              minHeight: "44px",
            }}
          />
          <button
            type="button"
            onClick={handleSubmitComment}
            style={{
              border: "none",
              backgroundColor: "#22c55e",
              color: "white",
              borderRadius: "999px",
              padding: "10px 14px",
              fontWeight: 700,
              cursor: "pointer",
              minHeight: "44px",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              position: "relative",
              zIndex: 2,
            }}
          >
            Post
          </button>
        </div>
      </div>
    </article>
  );
}