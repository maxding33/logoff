"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import type { Post } from "./types";
import type { ReportTarget } from "../lib/reports";

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

const BASE_POSITIONS = [
  { left: "4%",  top: "75%" },
  { left: "38%", top: "75%" },
  { left: "4%",  top: "86%" },
  { left: "38%", top: "86%" },
  { left: "20%", top: "80%" },
  { left: "52%", top: "80%" },
];

function getShuffledPositions(seed: number) {
  let s = seed === 0 ? 1 : Math.abs(seed);
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const arr = [...BASE_POSITIONS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type FeedPostProps = {
  post: Post;
  currentUsername: string;
  currentUserId: string;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onDeletePost?: (postId: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onReport?: (target: ReportTarget) => void;
  onOpenComments?: (postId: string) => void;
};

export default function FeedPost({
  post,
  currentUsername,
  currentUserId,
  onToggleLike,
  onAddComment,
  onDeletePost,
  onDeleteComment,
  onReport,
  onOpenComments,
}: FeedPostProps) {
  const [bouncing, setBouncing] = useState(false);
  const [floatingHeart, setFloatingHeart] = useState<{ x: number; y: number; key: number } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const lastTapRef = useRef<number>(0);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isOwnPost = post.user === currentUsername;

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

  return (
    <article style={{ borderBottom: "1px solid #e5e5e5" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px 10px 10px",
      }}>
        <Link href={isOwnPost ? "/profile" : `/user/${encodeURIComponent(post.user)}`} style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <Avatar name={post.user} avatarUrl={post.avatarUrl} />
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
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#999", marginRight: "4px" }}>{post.createdAt}</span>
          {(isOwnPost ? !!onDeletePost : !!onReport) && (
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
                  {isOwnPost && onDeletePost ? (
                    <button
                      type="button"
                      onClick={() => { setShowMenu(false); onDeletePost(post.id); }}
                      style={{ display: "block", width: "100%", padding: "14px 16px", border: "none", background: "transparent", textAlign: "left", fontSize: "14px", color: "#e53935", fontWeight: 600, cursor: "pointer", touchAction: "manipulation" }}
                    >
                      Delete post
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setShowMenu(false); onReport!({ type: "post", postId: post.id, reportedUserId: post.userId }); }}
                      style={{ display: "block", width: "100%", padding: "14px 16px", border: "none", background: "transparent", textAlign: "left", fontSize: "14px", color: "#000", fontWeight: 600, cursor: "pointer", touchAction: "manipulation" }}
                    >
                      Report post
                    </button>
                  )}
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
        {(() => {
          const idSeed = post.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
          const positions = getShuffledPositions(idSeed);
          return post.comments
            .filter((c) => c.text.trim().length <= 20)
            .slice(0, 4)
            .map((comment, i) => ({ comment, pos: positions[i] }));
        })().map(({ comment, pos }, i) => (
            <div
              key={comment.id}
              style={{
                position: "absolute",
                left: pos.left,
                top: pos.top,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                backgroundColor: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(16px) saturate(180%)",
                WebkitBackdropFilter: "blur(16px) saturate(180%)",
                borderRadius: "20px",
                padding: "4px 10px 4px 4px",
                border: "1px solid rgba(255,255,255,0.35)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
                animation: "fadeInBubble 0.4s ease forwards",
                animationDelay: `${i * 0.1}s`,
                opacity: 0,
                pointerEvents: "none",
                maxWidth: "140px",
              }}
            >
              {comment.avatarUrl ? (
                <img src={comment.avatarUrl} alt={comment.user} style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              ) : (
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
              )}
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "7px" }}>
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
            onClick={() => onOpenComments?.(post.id)}
            aria-label="Open comments"
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

      </div>
    </article>
  );
}
