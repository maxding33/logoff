"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { getDailyAnagramWord, getScrambledLetters, todayKey } from "../../../lib/dailyGame";
import { saveGameResult, getFriendsResults, type GameResult } from "../../../lib/gameResults";
import GameFriendPicker from "../../GameFriendPicker";

type Tile = { id: number; letter: string; slotIndex: number | null };

const STORAGE_KEY = todayKey("anagram");

function scoreLabel(score: number): string {
  if (score === 0) return "gave up";
  if (score === 1) return "1st try 🔥";
  return `${score} tries`;
}

export default function AnagramPage() {
  const router = useRouter();
  const word = getDailyAnagramWord();
  const len = word.length;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tiles, setTiles] = useState<Tile[]>(() =>
    getScrambledLetters(word).map((letter, i) => ({ id: i, letter, slotIndex: null }))
  );
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [friendResults, setFriendResults] = useState<GameResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const initialized = useRef(false);

  // Auth
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // Load saved state
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.won) {
      setTiles(word.split("").map((letter, i) => ({ id: i, letter, slotIndex: i })));
      setAttempts(saved.attempts ?? 1);
      setStatus("won");
    } else if (saved.lost) {
      setTiles(word.split("").map((letter, i) => ({ id: i, letter, slotIndex: i })));
      setStatus("lost");
    }
  }, [word]);

  // Load friend results when game ends
  useEffect(() => {
    if (status === "playing" || !currentUserId) return;
    setLoadingResults(true);
    getFriendsResults(currentUserId, "anagram")
      .then(setFriendResults)
      .catch(console.error)
      .finally(() => setLoadingResults(false));
  }, [status, currentUserId]);

  const getSlotLetter = (slotIdx: number) =>
    tiles.find((t) => t.slotIndex === slotIdx)?.letter ?? null;

  const allFilled = tiles.filter((t) => t.slotIndex !== null).length === len;

  const tapPoolTile = (id: number) => {
    if (status !== "playing") return;
    const usedSlots = new Set(tiles.map((t) => t.slotIndex).filter((s) => s !== null));
    const nextSlot = Array.from({ length: len }, (_, i) => i).find((i) => !usedSlots.has(i));
    if (nextSlot === undefined) return;
    setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, slotIndex: nextSlot } : t)));
  };

  const tapSlot = (slotIdx: number) => {
    if (status !== "playing") return;
    if (getSlotLetter(slotIdx) === null) return;
    setTiles((prev) => prev.map((t) => (t.slotIndex === slotIdx ? { ...t, slotIndex: null } : t)));
  };

  const clearAll = () => {
    if (status !== "playing") return;
    setTiles((prev) => prev.map((t) => ({ ...t, slotIndex: null })));
  };

  const finish = (won: boolean, finalAttempts: number) => {
    const score = won ? finalAttempts : 0;
    setTiles(word.split("").map((letter, i) => ({ id: i, letter, slotIndex: i })));
    setStatus(won ? "won" : "lost");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(won ? { won: true, attempts: finalAttempts } : { lost: true }));
    if (currentUserId) saveGameResult(currentUserId, "anagram", won, score).catch(console.error);
  };

  const check = () => {
    if (!allFilled || status !== "playing") return;
    const current = Array.from({ length: len }, (_, i) => getSlotLetter(i)).join("");
    if (current === word) {
      finish(true, attempts + 1);
    } else {
      setAttempts((a) => a + 1);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const giveUp = () => {
    if (status !== "playing") return;
    finish(false, 0);
  };

  const poolTiles = tiles.filter((t) => t.slotIndex === null);

  const tileSize = Math.min(46, Math.floor(320 / len) - 6);

  return (
    <main style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes shakeSlots {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        @keyframes popIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <header style={{
        padding: "0 16px", height: "53px", borderBottom: "1px solid #e5e5e5",
        display: "flex", alignItems: "center", gap: "10px", flexShrink: 0,
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "44px", minHeight: "44px", color: "#000" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <p style={{ margin: 0, fontSize: "17px", fontWeight: 800, letterSpacing: "0.02em" }}>anagram</p>
        {status === "playing" && currentUserId && (
          <button
            onClick={() => setShowFriendPicker(true)}
            style={{
              marginLeft: "auto", background: "none", border: "1px solid #e5e5e5",
              borderRadius: "999px", padding: "6px 14px",
              fontSize: "12px", fontWeight: 700, color: "#555",
              cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
              touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.58 3.38 2 2 0 0 1 3.55 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z" />
            </svg>
            ask a friend
          </button>
        )}
      </header>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 24px 40px" }}>

        <p style={{ margin: "0 0 28px", fontSize: "13px", color: "#aaa", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {status === "playing" ? "unscramble the word" : status === "won" ? "you got it" : "the word was"}
        </p>

        {/* Answer slots */}
        <div style={{
          display: "flex", gap: "8px", marginBottom: "36px",
          animation: shake ? "shakeSlots 0.45s ease" : "none",
        }}>
          {Array.from({ length: len }, (_, i) => {
            const letter = getSlotLetter(i);
            return (
              <button
                key={i}
                onClick={() => tapSlot(i)}
                style={{
                  width: tileSize, height: tileSize + 6,
                  borderRadius: "10px",
                  background: letter
                    ? (status === "won" ? "#eef6f1" : status === "lost" ? "#fef0f0" : "#000")
                    : "#f5f5f5",
                  border: letter ? "none" : "2px solid #e5e5e5",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "18px", fontWeight: 800,
                  color: letter
                    ? (status === "won" ? "#4a7c59" : status === "lost" ? "#e53935" : "#fff")
                    : "transparent",
                  cursor: letter && status === "playing" ? "pointer" : "default",
                  transition: "background 0.15s ease",
                  minWidth: "32px", minHeight: "38px",
                  touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                }}
              >
                {letter}
              </button>
            );
          })}
        </div>

        {/* Tile pool */}
        {status === "playing" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginBottom: "36px", minHeight: "56px" }}>
            {poolTiles.map((tile) => (
              <button
                key={tile.id}
                onClick={() => tapPoolTile(tile.id)}
                style={{
                  width: tileSize + 2, height: tileSize + 6,
                  borderRadius: "10px", background: "#f0f0f0", border: "none",
                  fontSize: "18px", fontWeight: 800, color: "#000",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                  minWidth: "36px", minHeight: "42px",
                }}
              >
                {tile.letter}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        {status === "playing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "280px" }}>
            <button
              onClick={check}
              disabled={!allFilled}
              style={{
                padding: "14px", borderRadius: "14px",
                background: allFilled ? "#000" : "#f0f0f0",
                color: allFilled ? "#fff" : "#bbb",
                border: "none", cursor: allFilled ? "pointer" : "default",
                fontSize: "15px", fontWeight: 700, letterSpacing: "0.04em",
                transition: "background 0.15s ease",
                touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
              }}
            >
              check
            </button>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={clearAll}
                style={{
                  flex: 1, padding: "12px", borderRadius: "14px",
                  background: "#f5f5f5", color: "#888", border: "none", cursor: "pointer",
                  fontSize: "14px", fontWeight: 600,
                  touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                }}
              >
                clear
              </button>
              <button
                onClick={giveUp}
                style={{
                  flex: 1, padding: "12px", borderRadius: "14px",
                  background: "#f5f5f5", color: "#888", border: "none", cursor: "pointer",
                  fontSize: "14px", fontWeight: 600,
                  touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                }}
              >
                reveal
              </button>
            </div>
            {attempts > 0 && (
              <p style={{ margin: 0, fontSize: "12px", color: "#ccc", textAlign: "center" }}>
                {attempts} wrong {attempts === 1 ? "try" : "tries"}
              </p>
            )}
          </div>
        )}

        {/* Result + leaderboard */}
        {status !== "playing" && (
          <div style={{ width: "100%", maxWidth: "320px", display: "flex", flexDirection: "column", alignItems: "center", gap: "0" }}>
            {status === "won" ? (
              <div style={{ textAlign: "center", marginBottom: "8px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "30px" }}>🎉</p>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#4a7c59" }}>
                  {scoreLabel(attempts)}
                </p>
              </div>
            ) : (
              <div style={{ textAlign: "center", marginBottom: "8px" }}>
                <p style={{ margin: "0 0 6px", fontSize: "14px", color: "#aaa" }}>better luck tomorrow</p>
              </div>
            )}

            {/* Friends leaderboard */}
            {(friendResults.length > 0 || loadingResults) && (
              <div style={{ width: "100%", marginTop: "24px", marginBottom: "8px" }}>
                <p style={{ margin: "0 0 12px", fontSize: "11px", fontWeight: 700, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center" }}>
                  friends today
                </p>
                {loadingResults ? (
                  <p style={{ textAlign: "center", fontSize: "13px", color: "#ccc" }}>loading...</p>
                ) : (
                  [...friendResults]
                    .sort((a, b) => {
                      if (a.won && !b.won) return -1;
                      if (!a.won && b.won) return 1;
                      if (a.won && b.won) return b.score - a.score;
                      return 0;
                    })
                    .map((r) => (
                      <div key={r.userId} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 0", borderBottom: "1px solid #f5f5f5",
                      }}>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#000" }}>@{r.username}</span>
                        <span style={{
                          fontSize: "12px", fontWeight: 700,
                          color: r.won ? "#4a7c59" : "#e53935",
                        }}>
                          {r.won ? scoreLabel(r.score) : "gave up"}
                        </span>
                      </div>
                    ))
                )}
              </div>
            )}

            <button
              onClick={() => router.back()}
              style={{
                marginTop: "24px", padding: "13px 40px", borderRadius: "14px",
                background: "#000", color: "#fff", border: "none", cursor: "pointer",
                fontSize: "14px", fontWeight: 700,
                touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
              }}
            >
              done
            </button>
          </div>
        )}
      </div>

      {showFriendPicker && currentUserId && (
        <GameFriendPicker
          game="anagram"
          userId={currentUserId}
          onClose={() => setShowFriendPicker(false)}
        />
      )}
    </main>
  );
}
