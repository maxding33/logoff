"use client";

import type { Post } from "./types";

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

function timerColor(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms < 2 * 60 * 60 * 1000) return "rgba(220,80,80,0.9)";
  if (ms < 5 * 60 * 60 * 1000) return "rgba(210,160,40,0.9)";
  return "rgba(0,0,0,0.55)";
}

function opacity(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  const totalMs = 24 * 60 * 60 * 1000;
  const ratio = ms / totalMs;
  // Full opacity until 20% remaining, then fade to 0.35
  if (ratio > 0.2) return 1;
  return 0.35 + (ratio / 0.2) * 0.65;
}

type Props = {
  posts: Post[];
  onTap: (post: Post) => void;
};

export default function FreePostGrid({ posts, onTap }: Props) {
  if (posts.length === 0) {
    return (
      <p style={{ textAlign: "center", color: "#999", fontSize: "14px", padding: "48px 16px" }}>
        nothing in your log yet. post anything outside the challenge window
      </p>
    );
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "2px",
      padding: "2px",
    }}>
      {posts.map((post) => {
        const label = post.expiresAt ? timeLeft(post.expiresAt) : null;
        const op = post.expiresAt ? opacity(post.expiresAt) : 1;
        const tColor = post.expiresAt ? timerColor(post.expiresAt) : "rgba(0,0,0,0.55)";

        return (
          <div
            key={post.id}
            onClick={() => onTap(post)}
            style={{
              position: "relative",
              aspectRatio: "1",
              overflow: "hidden",
              cursor: "pointer",
              opacity: op,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image}
              alt={post.caption}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            <div style={{
              position: "absolute",
              bottom: "6px",
              left: "6px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "rgba(0,0,0,0.55)",
              borderRadius: "12px",
              padding: "2px 6px 2px 2px",
            }}>
              {post.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.avatarUrl} alt={post.user} style={{ width: "16px", height: "16px", borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#4a7c59", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontSize: "8px", fontWeight: 700 }}>{post.user[0]?.toUpperCase()}</span>
                </div>
              )}
              <span style={{ color: "#fff", fontSize: "11px", fontWeight: 700 }}>{post.user}</span>
            </div>
            {label && (
              <div style={{
                position: "absolute",
                bottom: "6px",
                right: "6px",
                background: tColor,
                color: "#fff",
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: "4px",
                letterSpacing: "0.04em",
              }}>
                {label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
