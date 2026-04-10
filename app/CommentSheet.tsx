"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import type { Comment } from "./types";
import type { ReportTarget } from "../lib/reports";

type CommentSheetProps = {
  comments: Comment[];
  postId: string;
  currentUserId: string;
  onAddComment: (postId: string, text: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onReport?: (target: ReportTarget) => void;
  onClose: () => void;
};

export default function CommentSheet({
  comments,
  postId,
  currentUserId,
  onAddComment,
  onDeleteComment,
  onReport,
  onClose,
}: CommentSheetProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    // Lock body scroll while sheet is open
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    // Don't auto-focus — let user read comments first
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 250);
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddComment(postId, trimmed);
    setText("");
  };

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) handleClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: closing ? "transparent" : "rgba(0,0,0,0.35)",
        transition: "background 0.25s ease",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        ref={sheetRef}
        style={{
          background: "#fff",
          borderRadius: "16px 16px 0 0",
          height: "45vh",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          transform: closing ? "translateY(100%)" : "translateY(0)",
          transition: "transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
          animation: closing ? undefined : "sheet-up 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#ddd" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "4px 16px 12px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: "15px" }}>Comments</span>
          <button
            onClick={handleClose}
            style={{ background: "none", border: "none", fontSize: "18px", color: "#999", cursor: "pointer", padding: "4px 8px", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Comments list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", WebkitOverflowScrolling: "touch" }}>
          {comments.length === 0 ? (
            <p style={{ textAlign: "center", color: "#bbb", fontSize: "14px", padding: "24px 0" }}>No comments yet</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "14px" }}>
                <Avatar name={comment.user} size={28} avatarUrl={comment.avatarUrl} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 700, color: "#000" }}>{comment.user}</span>{" "}
                    <span style={{ color: "#333" }}>{comment.text}</span>
                  </p>
                </div>
                {comment.userId === currentUserId && onDeleteComment ? (
                  <button
                    onClick={() => onDeleteComment(postId, comment.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: "16px", padding: "0 4px", lineHeight: 1, flexShrink: 0 }}
                  >
                    ×
                  </button>
                ) : comment.userId !== currentUserId && onReport ? (
                  <button
                    onClick={() => onReport({ type: "comment", commentId: comment.id, reportedUserId: comment.userId })}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ddd", padding: "0 4px", lineHeight: 1, flexShrink: 0, display: "flex", alignItems: "center" }}
                    aria-label="Report comment"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
                    </svg>
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: "10px 16px calc(10px + env(safe-area-inset-bottom))",
          borderTop: "1px solid #f0f0f0",
          display: "flex",
          gap: "8px",
          alignItems: "center",
          background: "#fff",
        }}>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
            placeholder="Add a comment..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "16px",
              color: "#000",
              background: "transparent",
              minHeight: "44px",
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              border: "none",
              background: "transparent",
              color: text.trim() ? "#4a7c59" : "#ccc",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              padding: "4px 0",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              minHeight: "44px",
            }}
          >
            Post
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
