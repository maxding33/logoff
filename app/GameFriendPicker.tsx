"use client";

import { useEffect, useState } from "react";
import { getFriends } from "../lib/follows";
import { getOrCreateDM, sendMessage } from "../lib/messages";
import Avatar from "./Avatar";

type Friend = { id: string; username: string; avatarUrl: string | null };

const GAME_EMOJI: Record<string, string> = {
  anagram: "🔤",
  hangman: "💀",
};

export default function GameFriendPicker({
  game,
  userId,
  onClose,
}: {
  game: string;
  userId: string;
  onClose: () => void;
}) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    getFriends(userId)
      .then(setFriends)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const ask = async (friend: Friend) => {
    if (sending || sent) return;
    setSending(friend.id);
    try {
      const convId = await getOrCreateDM(userId, friend.id);
      const emoji = GAME_EMOJI[game] ?? "🎮";
      await sendMessage(convId, userId, `help me with today's ${game}? ${emoji}`);
      setSent(friend.id);
      setTimeout(onClose, 1000);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(null);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 600,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", background: "#fff",
          borderRadius: "20px 20px 0 0",
          padding: "20px 20px calc(20px + env(safe-area-inset-bottom))",
          maxHeight: "65vh", overflowY: "auto",
          animation: "gameFriendPickerUp 0.25s cubic-bezier(0.32,0.72,0,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes gameFriendPickerUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <p style={{ margin: 0, fontSize: "17px", fontWeight: 800 }}>phone a friend</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "22px", lineHeight: 1, padding: "4px 8px" }}>×</button>
        </div>

        {loading ? (
          <p style={{ color: "#aaa", fontSize: "14px", padding: "16px 0" }}>loading...</p>
        ) : friends.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: "14px", padding: "16px 0" }}>no friends yet</p>
        ) : (
          friends.map((friend) => (
            <button
              key={friend.id}
              onClick={() => ask(friend)}
              disabled={!!sent}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "12px 0",
                background: "none", border: "none",
                borderBottom: "1px solid #f5f5f5",
                cursor: sent ? "default" : "pointer",
                textAlign: "left",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Avatar name={friend.username} size={36} avatarUrl={friend.avatarUrl} />
                <span style={{ fontSize: "15px", fontWeight: 600, color: "#000" }}>@{friend.username}</span>
              </div>
              {sent === friend.id ? (
                <span style={{ fontSize: "12px", color: "#4a7c59", fontWeight: 700 }}>sent ✓</span>
              ) : sending === friend.id ? (
                <span style={{ fontSize: "12px", color: "#aaa" }}>...</span>
              ) : (
                <span style={{ fontSize: "12px", color: "#aaa", fontWeight: 600 }}>ask</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
