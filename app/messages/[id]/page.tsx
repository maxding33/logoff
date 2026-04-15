"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { getMessages, sendMessage, markAsRead, getConversationMembers, updateLastSeen, isOnline, getCachedMessages, getCachedMembers, setCachedMessages, setCachedMembers, type Message, type ConversationMember } from "../../../lib/messages";
import Avatar from "../../Avatar";
import ReportSheet from "../../ReportSheet";
import type { ReportTarget } from "../../../lib/reports";
import { blockUser, unblockUser, checkIsBlocked } from "../../../lib/blocks";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function groupMessagesByDate(messages: Message[]): { date: string; messages: Message[] }[] {
  const groups: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const date = formatDate(msg.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.date === date) {
      last.messages.push(msg);
    } else {
      groups.push({ date, messages: [msg] });
    }
  }
  return groups;
}

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = use(params);
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(getCachedMessages(conversationId));
  const [members, setMembers] = useState<ConversationMember[]>(getCachedMembers(conversationId));
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(getCachedMessages(conversationId).length === 0);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSeenInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setCurrentUserId(user.id);
      try {
        const [msgs, mems] = await Promise.all([
          getMessages(conversationId),
          getConversationMembers(conversationId),
        ]);
        setMessages(msgs);
        setMembers(mems);
        setCachedMessages(conversationId, msgs);
        setCachedMembers(conversationId, mems);
        await markAsRead(conversationId, user.id);
        await updateLastSeen(user.id);
        const otherMember = mems.find((m) => m.userId !== user.id);
        if (otherMember) {
          checkIsBlocked(user.id, otherMember.userId).then(setIsBlocked).catch(() => {});
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
  }, [conversationId]);

  // Keep last_seen fresh while in conversation
  useEffect(() => {
    if (!currentUserId) return;
    lastSeenInterval.current = setInterval(() => updateLastSeen(currentUserId), 60000);
    return () => { if (lastSeenInterval.current) clearInterval(lastSeenInterval.current); };
  }, [currentUserId]);

  // Realtime messages
  useEffect(() => {
    if (!supabase || !currentUserId) return;
    const msgChannel = supabase
      .channel(`conv-msgs-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, async () => {
        const msgs = await getMessages(conversationId);
        setMessages(msgs);
        setCachedMessages(conversationId, msgs);
        await markAsRead(conversationId, currentUserId);
      })
      .subscribe();

    const membersChannel = supabase
      .channel(`conv-members-${conversationId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "conversation_members",
        filter: `conversation_id=eq.${conversationId}`,
      }, async () => {
        const mems = await getConversationMembers(conversationId);
        setMembers(mems);
        setCachedMembers(conversationId, mems);
      })
      .subscribe();

    return () => {
      supabase!.removeChannel(msgChannel);
      supabase!.removeChannel(membersChannel);
    };
  }, [conversationId, currentUserId]);

  // Smooth scroll to bottom only for new incoming messages
  const prevMessageCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCount.current = messages.length;
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !currentUserId || sending) return;
    setSending(true);
    setText("");
    try {
      const msg = await sendMessage(conversationId, currentUserId, trimmed);
      setMessages((prev) => [...prev, msg]);
      // Fire push notification (don't await)
      fetch("/api/messages/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          senderId: currentUserId,
          senderUsername: msg.senderUsername,
          text: trimmed,
        }),
      }).catch(() => {});
    } catch (err) {
      console.error(err);
      setText(trimmed);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const isGroup = members.length > 1;
  const title = isGroup
    ? (members.map((m) => `@${m.username}`).join(", "))
    : members[0] ? `@${members[0].username}` : "...";

  const other = !isGroup ? members[0] : null;
  const otherOnline = other ? isOnline(other.lastSeen) : false;

  // Read receipt: find last message seen by all other members
  const getReadState = (msg: Message): boolean => {
    if (msg.senderId !== currentUserId) return false;
    return members.some((m) => m.userId !== currentUserId && new Date(m.lastReadAt) >= new Date(msg.createdAt));
  };

  const groups = groupMessagesByDate(messages);

  return (
    <main style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#fff" }}>
      {/* Header */}
      <header style={{
        padding: "0 16px", height: "53px", borderBottom: "1px solid #e5e5e5",
        display: "flex", alignItems: "center", gap: "10px", flexShrink: 0,
      }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "44px", minHeight: "44px", color: "#000" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ position: "relative", flexShrink: 0 }}>
          {other ? (
            <Avatar name={other.username} size={34} avatarUrl={other.avatarUrl} />
          ) : (
            <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#e5e5e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          )}
          {otherOnline && (
            <div style={{ position: "absolute", bottom: 0, right: 0, width: "10px", height: "10px", borderRadius: "50%", background: "#4a7c59", border: "2px solid #fff" }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
          {otherOnline && <p style={{ margin: 0, fontSize: "11px", color: "#4a7c59" }}>online</p>}
        </div>
        {other && currentUserId && (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setShowHeaderMenu((v) => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            {showHeaderMenu && (
              <div style={{ position: "absolute", right: 0, top: "100%", background: "#fff", border: "1px solid #e5e5e5", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 50, minWidth: "160px", overflow: "hidden" }}>
                <button
                  onClick={async () => {
                    setShowHeaderMenu(false);
                    if (isBlocked) {
                      await unblockUser(currentUserId, other.userId);
                      setIsBlocked(false);
                    } else {
                      await blockUser(currentUserId, other.userId);
                      setIsBlocked(true);
                    }
                  }}
                  style={{ display: "block", width: "100%", padding: "14px 16px", border: "none", background: "transparent", textAlign: "left", fontSize: "14px", color: isBlocked ? "#4a7c59" : "#e53935", fontWeight: 600, cursor: "pointer" }}
                >
                  {isBlocked ? "Unblock user" : "Block user"}
                </button>
                <button
                  onClick={() => { setShowHeaderMenu(false); setReportTarget({ type: "user", reportedUserId: other.userId }); }}
                  style={{ display: "block", width: "100%", padding: "14px 16px", border: "none", background: "transparent", textAlign: "left", fontSize: "14px", color: "#000", fontWeight: 600, cursor: "pointer", borderTop: "1px solid #f0f0f0" }}
                >
                  Report user
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 0", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        {loading || !currentUserId ? (
          <p style={{ textAlign: "center", color: "#999", fontSize: "14px", padding: "48px 0" }}>loading...</p>
        ) : messages.length === 0 ? (
          <p style={{ textAlign: "center", color: "#999", fontSize: "13px", padding: "48px 16px" }}>no messages yet. say hi</p>
        ) : (
          groups.map((group) => (
            <div key={group.date}>
              <div style={{ display: "flex", justifyContent: "center", margin: "12px 0 8px" }}>
                <span style={{ fontSize: "11px", color: "#aaa", background: "#f5f5f5", padding: "3px 10px", borderRadius: "999px" }}>{group.date}</span>
              </div>
              {group.messages.map((msg, i) => {
                const isMine = msg.senderId === currentUserId;
                const prevMsg = group.messages[i - 1];
                const showAvatar = !isMine && (!prevMsg || prevMsg.senderId !== msg.senderId);
                const isRead = getReadState(msg);

                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", padding: "2px 16px" }}>
                    {isGroup && !isMine && showAvatar && (
                      <span style={{ fontSize: "11px", color: "#aaa", marginLeft: "36px", marginBottom: "2px" }}>@{msg.senderUsername}</span>
                    )}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", flexDirection: isMine ? "row-reverse" : "row" }}>
                      {!isMine && (
                        <div style={{ width: "28px", flexShrink: 0 }}>
                          {showAvatar && <Avatar name={msg.senderUsername} size={28} avatarUrl={msg.senderAvatarUrl} />}
                        </div>
                      )}
                      <div
                        onTouchStart={() => {
                          if (isMine) return;
                          longPressTimer.current = setTimeout(() => {
                            setReportTarget({ type: "message", messageId: msg.id, reportedUserId: msg.senderId });
                          }, 600);
                        }}
                        onTouchEnd={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
                        onTouchMove={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
                        style={{
                          maxWidth: "70vw", padding: "9px 13px",
                          background: isMine ? "#000" : "#f0f0f0",
                          color: isMine ? "#fff" : "#000",
                          borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          fontSize: "14px", lineHeight: 1.4,
                          wordBreak: "break-word",
                          userSelect: "none",
                          WebkitUserSelect: "none",
                        }}
                      >
                        {msg.text}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px", paddingRight: isMine ? 0 : undefined, paddingLeft: isMine ? undefined : "34px" }}>
                      <span style={{ fontSize: "10px", color: "#bbb" }}>{formatTime(msg.createdAt)}</span>
                      {isMine && isRead && <span style={{ fontSize: "10px", color: "#4a7c59" }}>seen</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isBlocked ? (
        <div style={{ padding: "14px 16px calc(14px + env(safe-area-inset-bottom))", borderTop: "1px solid #e5e5e5", background: "#fafafa", textAlign: "center" }}>
          <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#999" }}>You&apos;ve blocked this user.</p>
          <button
            onClick={async () => { if (!currentUserId || !other) return; await unblockUser(currentUserId, other.userId); setIsBlocked(false); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 700, color: "#000", padding: 0 }}
          >
            Unblock
          </button>
        </div>
      ) : (
      <div style={{
        padding: "10px 16px calc(10px + env(safe-area-inset-bottom))",
        borderTop: "1px solid #e5e5e5",
        display: "flex", gap: "8px", alignItems: "center", flexShrink: 0, background: "#fff",
      }}>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
          placeholder="message..."
          style={{
            flex: 1, border: "1px solid #e5e5e5", borderRadius: "999px",
            padding: "10px 16px", fontSize: "16px", outline: "none",
            background: "#f9f9f9",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            width: "38px", height: "38px", borderRadius: "50%",
            background: text.trim() ? "#000" : "#e5e5e5",
            border: "none", cursor: text.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "background 0.15s ease",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={text.trim() ? "#fff" : "#aaa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
      )}
      {reportTarget && currentUserId && (
        <ReportSheet target={reportTarget} currentUserId={currentUserId} onClose={() => setReportTarget(null)} />
      )}
    </main>
  );
}
