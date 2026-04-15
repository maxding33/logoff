"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { getConversations, getOrCreateDM, createGroupChat, isOnline, setCachedConversationList, type Conversation } from "../../lib/messages";
import { getFriends } from "../../lib/follows";
import { getBlockedIds } from "../../lib/blocks";
import Avatar from "../Avatar";
import { getHomeCache } from "../../lib/homeCache";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getConvName(conv: Conversation, currentUserId: string): string {
  if (conv.isGroup && conv.name) return conv.name;
  const other = conv.members[0];
  return other ? `@${other.username}` : "unknown";
}

function getConvAvatar(conv: Conversation): { name: string; avatarUrl: string | null } {
  const other = conv.members[0];
  return { name: other?.username ?? "?", avatarUrl: other?.avatarUrl ?? null };
}

let cachedConversations: Conversation[] = [];
let cachedFriends: { id: string; username: string; avatarUrl: string | null }[] = [];

export default function MessagesPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>(cachedConversations);
  const [loading, setLoading] = useState(cachedConversations.length === 0);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [friends, setFriends] = useState<{ id: string; username: string; avatarUrl: string | null }[]>(cachedFriends);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setCurrentUserId(user.id);
      const [convsResult, friendsResult] = await Promise.allSettled([
        getConversations(user.id),
        getFriends(user.id),
      ]);
      if (convsResult.status === "fulfilled") { setConversations(convsResult.value); cachedConversations = convsResult.value; setCachedConversationList(convsResult.value); }
      else console.error("[messages] getConversations error:", convsResult.reason);
      if (friendsResult.status === "fulfilled") { setFriends(friendsResult.value); cachedFriends = friendsResult.value; }
      else console.error("[messages] getFriends error:", friendsResult.reason);
      getBlockedIds(user.id).then(setBlockedIds).catch(() => {});
      setLoading(false);
    });
  }, []);

  // Realtime updates
  useEffect(() => {
    if (!supabase || !currentUserId) return;
    const channel = supabase
      .channel("messages-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        getConversations(currentUserId).then((convs) => { setConversations(convs); cachedConversations = convs; setCachedConversationList(convs); }).catch(console.error);
      })
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [currentUserId]);

  const handleStartDM = async (friendId: string) => {
    if (!currentUserId || creating) return;
    setCreating(true);
    try {
      const convId = await getOrCreateDM(currentUserId, friendId);
      router.push(`/messages/${convId}`);
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!currentUserId || selectedFriends.length === 0 || !groupName.trim() || creating) return;
    setCreating(true);
    try {
      const convId = await createGroupChat(currentUserId, selectedFriends, groupName.trim());
      router.push(`/messages/${convId}`);
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  };

  const toggleFriend = (id: string) => {
    setSelectedFriends((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  };

  // Swipe-right-to-go-back
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [swipingBack, setSwipingBack] = useState(false);
  const [exitingBack, setExitingBack] = useState(false);
  const mountTime = useRef(Date.now());

  const directionLocked = useRef<"horizontal" | "vertical" | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (Date.now() - mountTime.current < 500) return;
    const touch = e.touches[0];
    swipeStart.current = { x: touch.clientX, y: touch.clientY };
    directionLocked.current = null;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeStart.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - swipeStart.current.x;
    const dy = Math.abs(touch.clientY - swipeStart.current.y);
    // Lock direction after 10px of movement
    if (!directionLocked.current && (dx > 10 || dy > 10)) {
      directionLocked.current = dx > dy ? "horizontal" : "vertical";
    }
    if (directionLocked.current === "vertical") { swipeStart.current = null; return; }
    if (directionLocked.current === "horizontal" && dx > 10) {
      setSwipingBack(true);
      setSwipeX(Math.max(0, dx));
    }
  };
  const handleTouchEnd = () => {
    if (!swipeStart.current || !swipingBack) { swipeStart.current = null; return; }
    if (swipeX > 100) {
      setExitingBack(true);
      setTimeout(() => router.back(), 200);
    } else {
      setSwipeX(0); setSwipingBack(false);
    }
    swipeStart.current = null;
  };

  const homeCache = (swipingBack || exitingBack) ? getHomeCache() : null;

  return (
    <>
    {(swipingBack || exitingBack) && homeCache && (
      <div style={{ position: "fixed", inset: 0, zIndex: -1, background: "#fff", overflow: "hidden" }}>
        {/* Home header */}
        <header style={{ padding: "0 16px", height: "53px", borderBottom: "1px solid #e5e5e5", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <span style={{ position: "absolute", left: "8px", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "52px", minHeight: "53px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <p style={{ margin: 0, fontSize: "18px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#000", marginRight: "-0.12em" }}>
            LOG<span style={{ color: "#4a7c59" }}>OFF</span>
          </p>
          <span style={{ position: "absolute", right: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#000" }}>{homeCache.streak} 🔥</span>
          </span>
        </header>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #e5e5e5" }}>
          {(["challenge", "free"] as const).map((tab) => (
            <div key={tab} style={{ flex: 1, textAlign: "center", padding: "10px 0", fontSize: "13px", fontWeight: 700, letterSpacing: "0.04em", color: homeCache.activeTab === tab ? "#000" : "#bbb", borderBottom: homeCache.activeTab === tab ? "2px solid #000" : "2px solid transparent" }}>
              {tab}
            </div>
          ))}
        </div>
        {/* Post previews */}
        <div style={{ padding: "0 0 96px" }}>
          {(homeCache.activeTab === "challenge" ? homeCache.posts : homeCache.freePosts).slice(0, 3).map((post) => (
            <div key={post.id} style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Avatar name={post.user} size={32} avatarUrl={post.avatarUrl} />
                <span style={{ fontSize: "14px", fontWeight: 700 }}>@{post.user}</span>
              </div>
              {post.image && (
                <div style={{ width: "100%", aspectRatio: "1", borderRadius: "12px", background: "#f0f0f0", overflow: "hidden" }}>
                  <img src={post.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Static bottom nav preview */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: "80px", background: "#fff", borderTop: "1px solid #e5e5e5", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 24px" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.75"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.75"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.75"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        </div>
        <div style={{ position: "fixed", inset: 0, background: `rgba(0,0,0,${Math.max(0, 0.08 - (swipeX / 1000))})`, pointerEvents: "none", transition: exitingBack ? "background 0.2s ease" : undefined }} />
      </div>
    )}
    <main
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        minHeight: "100vh", background: "#fff", paddingBottom: "80px",
        transform: swipingBack || exitingBack ? `translateX(${exitingBack ? "100%" : `${swipeX}px`})` : undefined,
        transition: swipingBack ? undefined : "transform 0.2s ease",
        opacity: swipingBack ? Math.max(0.6, 1 - swipeX / 500) : undefined,
        boxShadow: swipingBack || exitingBack ? "-4px 0 16px rgba(0,0,0,0.1)" : undefined,
      }}
    >
      <header style={{
        padding: "0 16px", height: "53px", borderBottom: "1px solid #e5e5e5",
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
      }}>
        <Link href="/" style={{ position: "absolute", left: "8px", color: "#000", display: "flex", alignItems: "center", minWidth: "44px", minHeight: "44px", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, letterSpacing: "0.06em" }}>messages</p>
        <div style={{ position: "absolute", right: "8px", display: "flex", gap: "4px" }}>
          <button
            onClick={() => { setShowNewDM(true); setShowNewGroup(false); }}
            style={{ background: "none", border: "none", cursor: "pointer", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", color: "#000" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="10" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <button
            onClick={() => { setShowNewGroup(true); setShowNewDM(false); }}
            style={{ background: "none", border: "none", cursor: "pointer", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", color: "#000" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
        </div>
      </header>

      {loading ? (
        <p style={{ textAlign: "center", color: "#999", fontSize: "14px", padding: "48px 0" }}>loading...</p>
      ) : conversations.length === 0 ? (
        <p style={{ textAlign: "center", color: "#999", fontSize: "14px", padding: "48px 16px" }}>
          no messages yet. tap the chat icon to start one
        </p>
      ) : (
        <div>
          {conversations.filter((conv) => !(!conv.isGroup && conv.members[0] && blockedIds.includes(conv.members[0].userId))).map((conv) => {
            const name = getConvName(conv, currentUserId ?? "");
            const avatar = conv.isGroup ? null : getConvAvatar(conv);
            const other = conv.members[0];
            const online = !conv.isGroup && other ? isOnline(other.lastSeen) : false;

            return (
              <Link key={conv.id} href={`/messages/${conv.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 16px", borderBottom: "1px solid #f0f0f0",
                  background: conv.unreadCount > 0 ? "#fafafa" : "#fff",
                }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    {conv.isGroup ? (
                      <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#e5e5e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                    ) : (
                      <Avatar name={avatar!.name} size={48} avatarUrl={avatar!.avatarUrl} />
                    )}
                    {online && (
                      <div style={{ position: "absolute", bottom: 1, right: 1, width: "12px", height: "12px", borderRadius: "50%", background: "#4a7c59", border: "2px solid #fff" }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2px" }}>
                      <span style={{ fontSize: "14px", fontWeight: conv.unreadCount > 0 ? 800 : 600, color: "#000", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                      {conv.lastMessage && (
                        <span style={{ fontSize: "11px", color: "#aaa", flexShrink: 0, marginLeft: "8px" }}>{formatTime(conv.lastMessage.createdAt)}</span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ margin: 0, fontSize: "13px", color: conv.unreadCount > 0 ? "#000" : "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "240px" }}>
                        {conv.lastMessage ? conv.lastMessage.text : "no messages yet"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <div style={{ background: "#000", color: "#fff", borderRadius: "999px", fontSize: "11px", fontWeight: 700, minWidth: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", flexShrink: 0, marginLeft: "8px" }}>
                          {conv.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* New DM sheet */}
      {showNewDM && (
        <div onClick={() => setShowNewDM(false)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "#fff", borderRadius: "16px 16px 0 0",
            maxHeight: "70vh", display: "flex", flexDirection: "column",
            animation: "slideUpSheet 0.28s cubic-bezier(0.32,0.72,0,1)",
          }}>
            <style>{`@keyframes slideUpSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: 700 }}>new message</span>
              <button onClick={() => setShowNewDM(false)} style={{ background: "none", border: "none", fontSize: "22px", color: "#999", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {friends.filter((f) => !blockedIds.includes(f.id)).length === 0 ? (
                <p style={{ textAlign: "center", color: "#aaa", fontSize: "13px", padding: "32px 16px" }}>no friends yet. add some first</p>
              ) : friends.filter((f) => !blockedIds.includes(f.id)).map((f) => (
                <button key={f.id} onClick={() => handleStartDM(f.id)} disabled={creating}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", background: "none", border: "none", borderBottom: "1px solid #f5f5f5", cursor: "pointer", textAlign: "left" }}>
                  <Avatar name={f.username} size={40} avatarUrl={f.avatarUrl} />
                  <span style={{ fontSize: "14px", fontWeight: 600 }}>@{f.username}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New group sheet */}
      {showNewGroup && (
        <div onClick={() => setShowNewGroup(false)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "#fff", borderRadius: "16px 16px 0 0",
            maxHeight: "80vh", display: "flex", flexDirection: "column",
            animation: "slideUpSheet 0.28s cubic-bezier(0.32,0.72,0,1)",
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: 700 }}>new group</span>
              <button onClick={() => setShowNewGroup(false)} style={{ background: "none", border: "none", fontSize: "22px", color: "#999", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0" }}>
              <input
                type="text"
                placeholder="group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                style={{ width: "100%", border: "none", outline: "none", fontSize: "16px", background: "transparent" }}
              />
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {friends.filter((f) => !blockedIds.includes(f.id)).length === 0 ? (
                <p style={{ textAlign: "center", color: "#aaa", fontSize: "13px", padding: "32px 16px" }}>no friends yet</p>
              ) : friends.filter((f) => !blockedIds.includes(f.id)).map((f) => {
                const selected = selectedFriends.includes(f.id);
                return (
                  <button key={f.id} onClick={() => toggleFriend(f.id)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", background: "none", border: "none", borderBottom: "1px solid #f5f5f5", cursor: "pointer", textAlign: "left" }}>
                    <Avatar name={f.username} size={40} avatarUrl={f.avatarUrl} />
                    <span style={{ fontSize: "14px", fontWeight: 600, flex: 1 }}>@{f.username}</span>
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", border: `2px solid ${selected ? "#000" : "#ddd"}`, background: selected ? "#000" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {selected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid #f0f0f0" }}>
              <button
                onClick={handleCreateGroup}
                disabled={selectedFriends.length === 0 || !groupName.trim() || creating}
                style={{ width: "100%", background: "#000", color: "#fff", border: "none", borderRadius: "999px", padding: "14px", fontSize: "14px", fontWeight: 700, cursor: selectedFriends.length > 0 && groupName.trim() ? "pointer" : "not-allowed", opacity: selectedFriends.length > 0 && groupName.trim() ? 1 : 0.4 }}
              >
                {creating ? "creating..." : `create group (${selectedFriends.length} selected)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
    </>
  );
}
