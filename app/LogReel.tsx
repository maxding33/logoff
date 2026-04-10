"use client";

import { useEffect, useRef, useState } from "react";
import type { Post } from "./types";
import type { ReportTarget } from "../lib/reports";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 45%, 55%)`;
}

const BUBBLE_POSITIONS = [
  { left: "6%",  top: "58%" },
  { left: "40%", top: "62%" },
  { left: "6%",  top: "72%" },
  { left: "40%", top: "72%" },
  { left: "22%", top: "66%" },
];

function getShuffledPositions(seed: number) {
  let s = seed === 0 ? 1 : Math.abs(seed);
  const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const arr = [...BUBBLE_POSITIONS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type Props = {
  posts: Post[];
  startIndex: number;
  currentUserId: string;
  currentUsername: string;
  onClose: () => void;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onDeletePost: (postId: string) => void;
  onReport?: (target: ReportTarget) => void;
};

export default function LogReel({
  posts,
  startIndex,
  currentUserId,
  currentUsername,
  onClose,
  onToggleLike,
  onAddComment,
  onDeleteComment,
  onDeletePost,
  onReport,
}: Props) {
  const [index, setIndex] = useState(startIndex);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [dragOffset, setDragOffset] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const dragging = useRef(false);
  const directionLocked = useRef(false);
  const horizDragging = useRef(false);
  const reelRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);
  const [floatingHeart, setFloatingHeart] = useState<{ x: number; y: number; key: number } | null>(null);

  const post = posts[index];

  // Close comments when post changes
  useEffect(() => { setShowComments(false); setCommentText(""); }, [index]);

  // Prevent body scroll while reel is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // containerY = -(index * 100vh) + dragOffset
  // Each post is at top: i * 100vh inside the container

  const snapTo = (newIndex: number) => {
    const clamped = Math.max(0, Math.min(posts.length - 1, newIndex));
    setSnapping(true);
    setDragOffset(0);
    setIndex(clamped);
    setTimeout(() => setSnapping(false), 320);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (showComments) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    dragging.current = true;
    directionLocked.current = false;
    horizDragging.current = false;
    setSnapping(false);
    if (reelRef.current) reelRef.current.style.transition = "none";
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || showComments) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Lock direction after 6px
    if (!directionLocked.current && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      directionLocked.current = true;
      horizDragging.current = dx > 0 && Math.abs(dx) > Math.abs(dy);
    }

    if (horizDragging.current) {
      const offset = Math.max(0, dx);
      // Rubber-band past 35% width
      const w = window.innerWidth;
      const clamped = offset > w * 0.35 ? w * 0.35 + (offset - w * 0.35) * 0.2 : offset;
      if (reelRef.current) reelRef.current.style.transform = `translateX(${clamped}px)`;
    } else {
      // Vertical post navigation
      const atStart = index === 0 && dy > 0;
      const atEnd = index === posts.length - 1 && dy < 0;
      setDragOffset(atStart || atEnd ? dy * 0.15 : dy);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!dragging.current || showComments) return;
    dragging.current = false;

    if (horizDragging.current) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (dx > window.innerWidth * 0.18) {
        // Animate off-screen then close
        if (reelRef.current) {
          reelRef.current.style.transition = "transform 0.26s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
          reelRef.current.style.transform = `translateX(${window.innerWidth}px)`;
        }
        setTimeout(onClose, 260);
      } else {
        // Spring back
        if (reelRef.current) {
          reelRef.current.style.transition = "transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
          reelRef.current.style.transform = "translateX(0)";
        }
      }
      return;
    }

    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY < -60) snapTo(index + 1);
    else if (deltaY > 60) snapTo(index - 1);
    else snapTo(index);
  };

  const handleDoubleTap = (e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!post.liked) onToggleLike(post.id);
      const touch = e.changedTouches[0];
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setFloatingHeart({ x: touch.clientX - rect.left, y: touch.clientY - rect.top, key: now });
      setTimeout(() => setFloatingHeart(null), 800);
    }
    lastTapRef.current = now;
  };

  const handleSubmitComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onAddComment(post.id, trimmed);
    setCommentText("");
  };

  return (
    <div
      ref={reelRef}
      style={{ position: "fixed", inset: 0, zIndex: 600, background: "#000", overflow: "hidden", touchAction: "none" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Stacked posts container — translates as one unit */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: 0,
        transform: `translateY(calc(-${index * 100}vh + ${dragOffset}px))`,
        transition: snapping ? "transform 0.32s cubic-bezier(0.32,0.72,0,1)" : "none",
        willChange: "transform",
      }}>
        {posts.map((p, i) => {
          const pBubblePositions = getShuffledPositions(p.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0));
          const pShortComments = p.comments.filter((c) => c.text.trim().length <= 20).slice(0, 4);
          return (
            <div key={p.id} style={{ position: "relative", height: "100vh", overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.caption} onTouchEnd={i === index ? handleDoubleTap : undefined} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
              {i === index && floatingHeart && (
                <svg key={floatingHeart.key} className="float-heart" width="70" height="70" viewBox="0 0 24 24"
                  fill="#4a7c59" stroke="#4a7c59" strokeWidth="1.5"
                  style={{ position: "absolute", left: floatingHeart.x, top: floatingHeart.y, pointerEvents: "none" }}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              )}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 40%, transparent 65%)", pointerEvents: "none" }} />
              {/* Floating bubbles per post */}
              {i === index && pShortComments.map((comment, ci) => (
                <div key={comment.id} style={{
                  position: "absolute", left: pBubblePositions[ci]?.left, top: pBubblePositions[ci]?.top,
                  display: "flex", alignItems: "center", gap: "5px",
                  backgroundColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(16px) saturate(180%)",
                  WebkitBackdropFilter: "blur(16px) saturate(180%)", borderRadius: "20px",
                  padding: "4px 10px 4px 4px", border: "1px solid rgba(255,255,255,0.35)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.12)", animation: "fadeInBubble 0.4s ease forwards",
                  animationDelay: `${ci * 0.1}s`, opacity: 0, pointerEvents: "none", maxWidth: "140px",
                }}>
                  {comment.avatarUrl ? (
                    <img src={comment.avatarUrl} alt={comment.user} style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: getAvatarColor(comment.user), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: "#fff", fontSize: "8px", fontWeight: 700, lineHeight: 1 }}>{getInitials(comment.user)}</span>
                    </div>
                  )}
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>{comment.text}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Fixed overlay UI — always shows current post's data */}
      {/* Bottom left: avatar + username + caption */}
      <div style={{ position: "fixed", bottom: "48px", left: "20px", right: "88px", zIndex: 5, pointerEvents: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          {post.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.avatarUrl} alt={post.user} style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", border: "2px solid #fff" }} />
          ) : (
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: getAvatarColor(post.user), display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff", flexShrink: 0 }}>
              <span style={{ color: "#fff", fontSize: "13px", fontWeight: 700 }}>{getInitials(post.user)}</span>
            </div>
          )}
          <span style={{ color: "#fff", fontSize: "16px", fontWeight: 700, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>@{post.user}</span>
        </div>
        {post.caption && post.caption.trim() && post.caption.trim() !== " " && (
          <p style={{ margin: 0, color: "#fff", fontSize: "14px", lineHeight: 1.5, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{post.caption}</p>
        )}
      </div>

      {/* Right side: like + comment + delete */}
      <div style={{ position: "fixed", bottom: "48px", right: "20px", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", gap: "28px" }}>
        <button type="button" onClick={() => onToggleLike(post.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill={post.liked ? "#4a7c59" : "none"} stroke={post.liked ? "#4a7c59" : "#fff"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span style={{ color: "#fff", fontSize: "13px", fontWeight: 700 }}>{post.likes}</span>
        </button>
        <button type="button" onClick={() => setShowComments(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{ color: "#fff", fontSize: "13px", fontWeight: 700 }}>{post.comments.length}</span>
        </button>
        {post.userId === currentUserId ? (
          <button type="button" onClick={() => { onDeletePost(post.id); onClose(); }} style={{ background: "none", border: "none", cursor: "pointer", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
          </button>
        ) : onReport && (
          <button type="button" onClick={() => onReport({ type: "post", postId: post.id, reportedUserId: post.userId })} style={{ background: "none", border: "none", cursor: "pointer", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress dots */}
      <div style={{ position: "fixed", top: "20px", left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: "5px", zIndex: 5, pointerEvents: "none" }}>
        {posts.length <= 12 ? (
          posts.map((_, i) => (
            <div key={i} style={{
              width: i === index ? "16px" : "6px",
              height: "6px",
              borderRadius: "3px",
              background: i === index ? "#fff" : "rgba(255,255,255,0.35)",
              transition: "width 0.2s ease, background 0.2s ease",
            }} />
          ))
        ) : (
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: 600 }}>{index + 1} / {posts.length}</span>
        )}
      </div>

      {/* Close button */}
      <button type="button" onClick={onClose} style={{ position: "fixed", top: "16px", right: "16px", background: "none", border: "none", color: "#fff", fontSize: "28px", cursor: "pointer", lineHeight: 1, zIndex: 10, touchAction: "manipulation" }}>×</button>

      {/* Comments sheet */}
      {showComments && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 20 }}
          onClick={() => setShowComments(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "#fff", borderRadius: "16px 16px 0 0",
              maxHeight: "60vh", display: "flex", flexDirection: "column",
              animation: "slideUpSheet 0.28s cubic-bezier(0.32,0.72,0,1)",
            }}
          >
            <style>{`
              @keyframes slideUpSheet {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
              }
            `}</style>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "14px", fontWeight: 700 }}>comments</span>
              <button type="button" onClick={() => setShowComments(false)} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#999", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "8px 20px" }}>
              {post.comments.length === 0 ? (
                <p style={{ color: "#bbb", fontSize: "13px", textAlign: "center", padding: "24px 0" }}>no comments yet</p>
              ) : (
                post.comments.map((c) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <div style={{ flexShrink: 0 }}>
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.user} style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: getAvatarColor(c.user), display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "#fff", fontSize: "10px", fontWeight: 700, lineHeight: 1 }}>{getInitials(c.user)}</span>
                        </div>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: "13px", flex: 1 }}>
                      <span style={{ fontWeight: 700, color: "#000" }}>{c.user}</span>{" "}
                      <span style={{ color: "#444" }}>{c.text}</span>
                    </p>
                    {c.userId === currentUserId ? (
                      <button type="button" onClick={() => onDeleteComment(post.id, c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: "18px", padding: "0 0 0 8px", lineHeight: 1, flexShrink: 0, touchAction: "manipulation" }}>×</button>
                    ) : onReport && (
                      <button type="button" onClick={() => onReport({ type: "comment", commentId: c.id, reportedUserId: c.userId })} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: "0 0 0 8px", lineHeight: 1, flexShrink: 0, display: "flex", alignItems: "center", touchAction: "manipulation" }} aria-label="Report comment">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: "10px 16px", borderTop: "1px solid #f0f0f0", display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSubmitComment(); } }}
                placeholder="add a comment..."
                autoFocus
                style={{ flex: 1, border: "none", outline: "none", fontSize: "16px", background: "transparent", minHeight: "44px" }}
              />
              <button
                type="button"
                onClick={handleSubmitComment}
                style={{ border: "none", background: "transparent", color: "#000", fontWeight: 700, fontSize: "13px", cursor: "pointer", minHeight: "44px", touchAction: "manipulation" }}
              >post</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
