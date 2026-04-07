"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "../Avatar";
import { supabase } from "../../lib/supabase";

type UserResult = { id: string; username: string; display_name: string | null; avatar_url: string | null };

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) { setResults([]); setLoading(false); return; }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from("users")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`)
        .limit(30);
      setResults((data ?? []).filter((u) => u.id !== currentUserId));
      setLoading(false);
    }, 200);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, currentUserId]);

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
            onFocus={() => {
              const viewport = document.querySelector("meta[name=viewport]");
              if (viewport) viewport.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1");
            }}
            onBlur={() => {
              const viewport = document.querySelector("meta[name=viewport]");
              if (viewport) viewport.setAttribute("content", "width=device-width, initial-scale=1");
            }}
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
        {!query.trim() ? (
          <li style={{ padding: "48px 16px", textAlign: "center", color: "#bbb", fontSize: "14px" }}>
            type a name to find people
          </li>
        ) : loading ? (
          <li style={{ padding: "48px 16px", textAlign: "center", color: "#bbb", fontSize: "14px" }}>
            searching...
          </li>
        ) : results.length === 0 ? (
          <li style={{ padding: "48px 16px", textAlign: "center", color: "#bbb", fontSize: "14px" }}>
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
