"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "../Avatar";
import { supabase } from "../../lib/supabase";

type UserResult = { id: string; username: string; display_name: string | null; avatar_url: string | null };

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [allUsers, setAllUsers] = useState<UserResult[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
    supabase.from("users").select("id, username, display_name, avatar_url").then(({ data }) => {
      if (data) setAllUsers(data);
    });
  }, []);

  const results = query.trim()
    ? allUsers.filter((u) => {
        const q = query.toLowerCase();
        return u.id !== currentUserId && (
          u.username.toLowerCase().includes(q) ||
          (u.display_name ?? "").toLowerCase().includes(q)
        );
      })
    : allUsers.filter((u) => u.id !== currentUserId);

  return (
    <main style={{ minHeight: "100vh", background: "#fff", paddingBottom: "80px" }}>
      {/* Header */}
      <header style={{
        padding: "0 16px",
        height: "53px",
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

        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: "8px",
          background: "#f5f5f5", borderRadius: "10px", padding: "8px 12px",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search by name..."
            autoFocus
            style={{
              flex: 1, border: "none", outline: "none",
              background: "transparent", fontSize: "15px", color: "#000",
            }}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")}
              style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, color: "#999", fontSize: "16px", lineHeight: 1 }}>
              ×
            </button>
          )}
        </div>
      </header>

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {results.length === 0 ? (
          <li style={{ padding: "40px 16px", textAlign: "center", color: "#999", fontSize: "14px" }}>
            no users found
          </li>
        ) : (
          results.map((user) => (
            <Link
              key={user.id}
              href={`/user/${encodeURIComponent(user.username)}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <li style={{
                display: "flex", alignItems: "center", gap: "14px",
                padding: "12px 16px", borderBottom: "1px solid #f0f0f0",
              }}>
                <Avatar name={user.username} avatarUrl={user.avatar_url} />
                <div>
                  {user.display_name && (
                    <p style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#000" }}>{user.display_name}</p>
                  )}
                  <p style={{ margin: 0, fontSize: "13px", color: user.display_name ? "#888" : "#000", fontWeight: user.display_name ? 400 : 600 }}>@{user.username}</p>
                </div>
              </li>
            </Link>
          ))
        )}
      </ul>
    </main>
  );
}
