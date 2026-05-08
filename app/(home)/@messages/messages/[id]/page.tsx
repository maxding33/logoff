"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";
import { getMessages, sendMessage, markAsRead, getConversationMembers, updateLastSeen, isOnline, getCachedMessages, getCachedMembers, setCachedMessages, setCachedMembers, getCachedConversationList, type Message, type ConversationMember, type Conversation } from "../../../../../lib/messages";
import Avatar from "../../../../Avatar";
import ReportSheet from "../../../../ReportSheet";
import type { ReportTarget } from "../../../../../lib/reports";
import { blockUser, unblockUser, checkIsBlocked } from "../../../../../lib/blocks";

// Sketchy hand-drawn tree/nature pattern for chat background
const NATURE_PATTERN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'>
  <g stroke='%234a7c59' fill='none' stroke-linecap='round' stroke-linejoin='round'>
    <!-- pine tree 1 -->
    <g opacity='0.055' stroke-width='1.2'>
      <line x1='40' y1='70' x2='40' y2='52'/>
      <polyline points='28,58 40,36 52,58'/>
      <polyline points='31,52 40,32 49,52'/>
    </g>
    <!-- small leaf cluster -->
    <g opacity='0.04' stroke-width='1'>
      <path d='M180,35 Q188,22 182,12 Q172,22 180,35'/>
      <line x1='180' y1='35' x2='182' y2='44'/>
      <path d='M190,30 Q196,20 191,13 Q184,20 190,30'/>
      <line x1='190' y1='30' x2='191' y2='37'/>
    </g>
    <!-- pine tree 2 -->
    <g opacity='0.045' stroke-width='1.1'>
      <line x1='130' y1='155' x2='130' y2='135'/>
      <polyline points='118,145 130,122 142,145'/>
      <polyline points='121,139 130,118 139,139'/>
      <polyline points='124,133 130,115 136,133'/>
    </g>
    <!-- fern frond -->
    <g opacity='0.035' stroke-width='0.9'>
      <path d='M60,190 Q55,175 65,160'/>
      <path d='M58,182 Q50,178 48,172'/>
      <path d='M60,175 Q52,172 50,166'/>
      <path d='M62,168 Q56,166 55,161'/>
    </g>
    <!-- small branch -->
    <g opacity='0.04' stroke-width='0.9'>
      <path d='M200,100 Q210,90 215,95'/>
      <path d='M207,94 Q212,85 218,87'/>
      <path d='M203,97 Q195,90 197,84'/>
    </g>
    <!-- tiny tree 3 -->
    <g opacity='0.04' stroke-width='1'>
      <line x1='28' y1='230' x2='28' y2='218'/>
      <polyline points='20,224 28,210 36,224'/>
    </g>
    <!-- scattered dots (seeds/berries) -->
    <g opacity='0.03' stroke-width='0' fill='%234a7c59'>
      <circle cx='95' cy='85' r='1.2'/>
      <circle cx='175' cy='200' r='1'/>
      <circle cx='220' cy='160' r='1.1'/>
      <circle cx='15' cy='130' r='1'/>
    </g>
  </g>
</svg>`;

const CHAT_BG = `url("data:image/svg+xml,${encodeURIComponent(NATURE_PATTERN_SVG.replace(/\n\s*/g, ''))}")`;

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

let cachedUserId: string | null = null;

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = use(params);
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(cachedUserId);
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
      cachedUserId = user.id;
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

  useEffect(() => {
    if (!currentUserId) return;
    lastSeenInterval.current = setInterval(() => updateLastSeen(currentUserId), 60000);
    return () => { if (lastSeenInterval.current) clearInterval(lastSeenInterval.current); };
  }, [currentUserId]);

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

  const otherMembers = members.filter((m) => m.userId !== currentUserId);
  const isGroup = otherMembers.length > 1;
  const title = isGroup
    ? (otherMembers.map((m) => `@${m.username}`).join(", "))
    : otherMembers[0] ? `@${otherMembers[0].username}` : "...";

  const other = !isGroup ? otherMembers[0] : null;
  const otherOnline = other ? isOnline(other.lastSeen) : false;

  const getReadState = (msg: Message): boolean => {
    if (msg.senderId !== currentUserId) return false;
    return members.some((m) => m.userId !== currentUserId && new Date(m.lastReadAt) >= new Date(msg.createdAt));
  };

  const groups = groupMessagesByDate(messages);

  // Swipe-right-to-go-back
  const mainRef = useRef<HTMLElement>(null);
  const swipeStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const exiting = false;
  const directionLocked = useRef<"horizontal" | "vertical" | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    swipeStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    directionLocked.current = null;
  };

  // Native (non-passive) touchmove so e.preventDefault() blocks vertical scroll
  const handleTouchMove = (e: TouchEvent) => {
    if (!swipeStart.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - swipeStart.current.x;
    const dy = Math.abs(touch.clientY - swipeStart.current.y);
    if (!directionLocked.current && (Math.abs(dx) > 10 || dy > 10)) {
      directionLocked.current = Math.abs(dx) > dy ? "horizontal" : "vertical";
    }
    if (directionLocked.current === "vertical") { swipeStart.current = null; return; }
    if (directionLocked.current === "horizontal") {
      e.preventDefault(); // lock out vertical scrolling
      if (dx > 10) {
        setSwiping(true);
        setSwipeX(Math.max(0, dx));
      }
    }
  };

  // Attach as non-passive so e.preventDefault() works on mobile
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", handleTouchMove);
  });

  const handleTouchEnd = () => {
    if (!swipeStart.current || !swiping) { swipeStart.current = null; return; }
    if (swipeX > 100) {
      router.push("/messages");
    } else {
      setSwipeX(0);
      setSwiping(false);
    }
    swipeStart.current = null;
  };

  const cachedConvs = getCachedConversationList();

  // --- Spatial transition: back layer parallax + dim overlay ---
  // Back layer starts offset left, slides into place at ~1/3 front speed (iOS-style)
  const backTranslateX = -80 + swipeX * 0.22;
  // Dim overlay fades as the chat slides away
  const backDimOpacity = Math.max(0, 0.12 - swipeX * 0.00032);

  return (
    <>
      {/* Cached messages list preview behind the chat */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 55,
        background: "#fff", overflowY: "auto", pointerEvents: "none",
        transform: `translateX(${backTranslateX}px)`,
        transition: swiping ? "none" : "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
        willChange: swiping ? "transform" : undefined,
      }}>
        <header style={{
          padding: "0 16px", height: "53px", borderBottom: "1px solid #e5e5e5",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, letterSpacing: "0.06em" }}>messages</p>
        </header>
        <div>
          {cachedConvs.map((conv) => {
            const convName = conv.isGroup && conv.name ? conv.name : conv.members[0] ? `@${conv.members[0].username}` : "unknown";
            const avatarMember = conv.members[0];
            return (
              <div key={conv.id} style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "12px 16px", borderBottom: "1px solid #f0f0f0",
              }}>
                <div style={{ flexShrink: 0 }}>
                  {conv.isGroup ? (
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#e5e5e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                  ) : (
                    <Avatar name={avatarMember?.username ?? "?"} size={48} avatarUrl={avatarMember?.avatarUrl ?? null} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#000" }}>{convName}</span>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {conv.lastMessage ? conv.lastMessage.text : "no messages yet"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dim scrim between messages list and chat — fades out as chat slides away */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 56,
        background: "#000",
        opacity: backDimOpacity,
        pointerEvents: "none",
        transition: swiping ? "none" : "opacity 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
      }} />

      {/* Chat overlay */}
      <main
        ref={mainRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: "fixed", inset: 0, zIndex: 60,
          display: "flex", flexDirection: "column", background: "#fff",
          boxShadow: swiping ? "-6px 0 24px rgba(0,0,0,0.12)" : undefined,
          borderRadius: swiping ? "10px 0 0 10px" : undefined,
          overflow: swiping ? "hidden" : undefined,
          animation: exiting ? undefined : "chatSlideIn 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
          transform: swiping || exiting ? `translateX(${exiting ? "100%" : `${swipeX}px`})` : undefined,
          transition: swiping ? "none" : "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1), border-radius 0.2s ease, box-shadow 0.2s ease",
          willChange: swiping ? "transform" : undefined,
        }}
      >
        <style>{`
          @keyframes chatSlideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>
      {/* Header */}
      <header style={{
        padding: "0 16px", height: "53px", borderBottom: "1px solid #dce8e0",
        display: "flex", alignItems: "center", gap: "10px", flexShrink: 0,
        background: "#fff",
      }}>
        <button onClick={() => router.push("/messages")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "44px", minHeight: "44px", color: "#000" }}>
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
      <div style={{
        flex: 1, overflowY: "auto", padding: "12px 0",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        background: `#f7faf8 ${CHAT_BG}`,
        backgroundSize: "240px 240px",
      }}>
        {loading || !currentUserId ? (
          <p style={{ textAlign: "center", color: "#8aaa96", fontSize: "14px", padding: "48px 0" }}>loading...</p>
        ) : messages.length === 0 ? (
          <p style={{ textAlign: "center", color: "#8aaa96", fontSize: "13px", padding: "48px 16px" }}>no messages yet. say hi</p>
        ) : (
          groups.map((group) => (
            <div key={group.date}>
              <div style={{ display: "flex", justifyContent: "center", margin: "12px 0 8px" }}>
                <span style={{ fontSize: "11px", color: "#6b9b7a", background: "rgba(74,124,89,0.08)", padding: "3px 10px", borderRadius: "999px", fontWeight: 500 }}>{group.date}</span>
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
                          background: isMine ? "#2d5a3d" : "rgba(255,255,255,0.85)",
                          color: isMine ? "#fff" : "#1a1a1a",
                          borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          fontSize: "14px", lineHeight: 1.4,
                          wordBreak: "break-word",
                          userSelect: "none",
                          WebkitUserSelect: "none",
                          boxShadow: isMine ? undefined : "0 1px 2px rgba(74,124,89,0.06)",
                        }}
                      >
                        {msg.text}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px", paddingRight: isMine ? 0 : undefined, paddingLeft: isMine ? undefined : "34px" }}>
                      <span style={{ fontSize: "10px", color: "#9bbba8" }}>{formatTime(msg.createdAt)}</span>
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
        borderTop: "1px solid #dce8e0",
        display: "flex", gap: "8px", alignItems: "center", flexShrink: 0, background: "#f7faf8",
      }}>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
          placeholder="message..."
          style={{
            flex: 1, border: "1px solid #d5e5da", borderRadius: "999px",
            padding: "10px 16px", fontSize: "16px", outline: "none",
            background: "#f5faf7",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            width: "38px", height: "38px", borderRadius: "50%",
            background: text.trim() ? "#4a7c59" : "#d5e5da",
            border: "none", cursor: text.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "background 0.15s ease",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={text.trim() ? "#fff" : "#8aaa96"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    </>
  );
}
