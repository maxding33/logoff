"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import type { Post } from "./types";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 45%, 55%)`;
}

const BUBBLE_POSITIONS = [
  { left: "8%",  top: "12%" },
  { left: "52%", top: "58%" },
  { left: "48%", top: "10%" },
  { left: "6%",  top: "60%" },
];

type FeedPostProps = {
  post: Post;
  onToggleLike: (postId: number) => void;
  onAddComment: (postId: number, text: string) => void;
  onDeletePost?: (postId: number) => void;
};

export default function FeedPost({
  post,
  onToggleLike,
  onAddComment,
  onDeletePost,
}: FeedPostProps) {
  const [commentText, setCommentText] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [floatingHeart, setFloatingHeart] = useState<{ x: number; y: number; key: number } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const lastTapRef = useRef<number>(0);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const commentRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isOwnPost = post.user === "You";

  useEffect(() => {
    if (!showCommentInput) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (commentRef.current && !commentRef.current.contains(e.target as Node)) {
        setShowCommentInput(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showCommentInput]);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showMenu]);

  const handleDoubleTap = (e: React.TouchEvent | React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!post.liked) handleLike();
      const rect = imageRef.current?.getBoundingClientRect();
      if (rect) {
        let x: number, y: number;
        if ("changedTouches" in e) {
          const touch = e.changedTouches[0];
          x = touch.clientX - rect.left;
          y = touch.clientY - rect.top;
        } else {
          x = e.clientX - rect.left;
          y = e.clientY - rect.top;
        }
        setFloatingHeart({ x, y, key: now });
        setTimeout(() => setFloatingHeart(null), 800);
      }
    }
    lastTapRef.current = now;
  };

  const handleLike = () => {
    if (!post.liked) {
      setBouncing(true);
      setTimeout(() => setBouncing(false), 350);
    }
    onToggleLike(post.id);
  };

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
        <Link href={`/user/${encodeURIComponent(post.user)}`} style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <Avatar name={post.user} />
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
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#999" }}>{post.createdAt}</span>
          {isOwnPost && onDeletePost && (
            <div ref={menuRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowMenu((v) => !v)}
                aria-label="Post options"
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "4px",
                  minWidth: "44px",
                  minHeight: "44px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#999",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </button>
              {showMenu && (
                <div style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  backgroundColor: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  zIndex: 50,
                  minWidth: "140px",
                  overflow: "hidden",
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onDeletePost(post.id);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "14px 16px",
                      border: "none",
                      background: "transparent",
                      textAlign: "left",
                      fontSize: "14px",
                      color: "#e53935",
                      fontWeight: 600,
                      cursor: "pointer",
                      touchAction: "manipulation",
                    }}
                  >
                    Delete post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Photo - full width, square */}
      <div style={{ position: "relative" }}>
        <img
          ref={imageRef}
          src={post.image}
          alt={post.caption || `${post.user} post`}
          onTouchEnd={handleDoubleTap}
          onDoubleClick={handleDoubleTap}
          style={{
            display: "block",
            width: "100%",
            aspectRatio: "1 / 1",
            objectFit: "cover",
            backgroundColor: "#f0f0f0",
          }}
        />
        {/* Floating short comments */}
        {post.comments
          .filter((c) => c.text.trim().split(/\s+/).length <= 3)
          .slice(0, 4)
          .map((comment, i) => (
            <div
              key={comment.id}
              style={{
                position: "absolute",
                left: BUBBLE_POSITIONS[i].left,
                top: BUBBLE_POSITIONS[i].top,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                backgroundColor: "rgba(255,255,255,0.88)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                borderRadius: "20px",
                padding: "4px 10px 4px 4px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
                animation: "fadeInBubble 0.4s ease forwards",
                animationDelay: `${i * 0.1}s`,
                opacity: 0,
                pointerEvents: "none",
                maxWidth: "140px",
              }}
            >
              <div style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: getAvatarColor(comment.user),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{ color: "#fff", fontSize: "8px", fontWeight: 700, lineHeight: 1 }}>
                  {getInitials(comment.user)}
                </span>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {comment.text}
              </span>
            </div>
          ))
        }

        {floatingHeart && (
          <svg
            key={floatingHeart.key}
            className="float-heart"
            width="70" height="70" viewBox="0 0 24 24"
            fill="#4a7c59" stroke="#4a7c59" strokeWidth="1.5"
            style={{
              position: "absolute",
              left: floatingHeart.x,
              top: floatingHeart.y,
            }}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: "8px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "22px", marginBottom: "10px" }}>
          <button
            type="button"
            onClick={handleLike}
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
            <svg
              width="26" height="26" viewBox="0 0 24 24"
              fill={post.liked ? "#4a7c59" : "none"}
              stroke={post.liked ? "#4a7c59" : "#000"} strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round"
              className={bouncing ? "heart-bounce" : ""}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
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
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg
              width="26" height="26" viewBox="0 0 24 24"
              fill="none" stroke="#000" strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>

        {/* Caption */}
        {post.caption && (
          <p style={{ margin: "0 0 6px", fontSize: "14px", color: "#000", lineHeight: 1.4, fontWeight: 500 }}>
            <span style={{ fontWeight: 700 }}>{post.user}</span>{" "}{post.caption}
          </p>
        )}

        {/* Comments */}
        {post.comments.length > 0 && (
          <div style={{ marginBottom: "6px" }}>
            {post.comments.map((comment) => (
              <p key={comment.id} style={{ margin: "0 0 3px", fontSize: "12px", color: "#777", lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, color: "#555" }}>{comment.user}</span>{" "}{comment.text}
              </p>
            ))}
          </div>
        )}

        {/* Comment input - only shown when toggled */}
        {showCommentInput && (
          <div ref={commentRef} style={{ display: "flex", gap: "8px", alignItems: "center", borderTop: "1px solid #f0f0f0", paddingTop: "10px", marginTop: "6px" }}>
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
