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
  const [showCommentInput, setShowCommentInput] = useState(false);

  const handleSubmitComment = () => {
    const trimmedComment = commentText.trim();
    if (!trimmedComment) return;
    onAddComment(post.id, trimmedComment);
    setCommentText("");
    setShowCommentInput(false);
  };

  return (
    <article style={{ borderBottom: "1px solid #e5e5e5" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
      }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: "14px", color: "#000" }}>
            {post.user}
          </span>
          {post.location && (
            <span style={{ fontSize: "13px", color: "#666", marginLeft: "6px" }}>
              {post.location}
            </span>
          )}
        </div>
        <span style={{ fontSize: "12px", color: "#999" }}>{post.createdAt}</span>
      </div>

      {/* Photo - full width, square */}
      <img
        src={post.image}
        alt={post.caption || `${post.user} post`}
        style={{
          display: "block",
          width: "100%",
          aspectRatio: "1 / 1",
          objectFit: "cover",
          backgroundColor: "#f0f0f0",
        }}
      />

      {/* Actions */}
      <div style={{ padding: "10px 14px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "8px" }}>
          <button
            type="button"
            onClick={() => onToggleLike(post.id)}
            aria-label={post.liked ? "Unlike post" : "Like post"}
            style={{
              border: "none",
              background: "transparent",
              padding: "4px 0",
              cursor: "pointer",
              fontSize: "20px",
              lineHeight: 1,
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              minHeight: "44px",
            }}
          >
            <span>{post.liked ? "❤️" : "🤍"}</span>
            <span style={{ fontSize: "13px", color: "#000", fontWeight: 600 }}>
              {post.likes}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowCommentInput((v) => !v)}
            aria-label="Toggle comment input"
            style={{
              border: "none",
              background: "transparent",
              padding: "4px 0",
              cursor: "pointer",
              fontSize: "20px",
              lineHeight: 1,
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              minHeight: "44px",
            }}
          >
            💬
          </button>
        </div>

        {/* Caption */}
        {post.caption && (
          <p style={{ margin: "0 0 6px", fontSize: "14px", color: "#000", lineHeight: 1.4 }}>
            <span style={{ fontWeight: 700 }}>{post.user}</span>{" "}{post.caption}
          </p>
        )}

        {/* Comments */}
        {post.comments.length > 0 && (
          <div style={{ marginBottom: "6px" }}>
            {post.comments.map((comment) => (
              <p key={comment.id} style={{ margin: "0 0 3px", fontSize: "13px", color: "#000", lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700 }}>{comment.user}</span>{" "}{comment.text}
              </p>
            ))}
          </div>
        )}

        {/* Comment input - only shown when toggled */}
        {showCommentInput && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", borderTop: "1px solid #f0f0f0", paddingTop: "10px", marginTop: "6px" }}>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
              placeholder="add a comment..."
              autoFocus
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: "13px",
                color: "#000",
                background: "transparent",
                minHeight: "44px",
              }}
            />
            <button
              type="button"
              onClick={handleSubmitComment}
              style={{
                border: "none",
                background: "transparent",
                color: "#000",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                padding: "4px 0",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                minHeight: "44px",
              }}
            >
              post
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
