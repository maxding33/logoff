"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { getDailyHangmanWord, todayKey } from "../../../lib/dailyGame";
import { saveGameResult, getFriendsResults, type GameResult } from "../../../lib/gameResults";
import GameFriendPicker from "../../GameFriendPicker";

const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const MAX_WRONG = 6;
const STORAGE_KEY = todayKey("hangman");

function HangmanFigure({ wrongCount }: { wrongCount: number }) {
  return (
    <svg width="130" height="160" viewBox="0 0 130 160" style={{ display: "block" }}>
      <line x1="15" y1="150" x2="115" y2="150" stroke="#000" strokeWidth="3" strokeLinecap="round" />
      <line x1="45" y1="150" x2="45" y2="10" stroke="#000" strokeWidth="3" strokeLinecap="round" />
      <line x1="45" y1="10" x2="90" y2="10" stroke="#000" strokeWidth="3" strokeLinecap="round" />
      <line x1="90" y1="10" x2="90" y2="30" stroke="#000" strokeWidth="2" strokeLinecap="round" />
      {wrongCount >= 1 && <circle cx="90" cy="42" r="12" stroke="#000" strokeWidth="2" fill="none" />}
      {wrongCount >= 2 && <line x1="90" y1="54" x2="90" y2="100" stroke="#000" strokeWidth="2" strokeLinecap="round" />}
      {wrongCount >= 3 && <line x1="90" y1="68" x2="68" y2="88" stroke="#000" strokeWidth="2" strokeLinecap="round" />}
      {wrongCount >= 4 && <line x1="90" y1="68" x2="112" y2="88" stroke="#000" strokeWidth="2" strokeLinecap="round" />}
      {wrongCount >= 5 && <line x1="90" y1="100" x2="68" y2="128" stroke="#000" strokeWidth="2" strokeLinecap="round" />}
      {wrongCount >= 6 && <line x1="90" y1="100" x2="112" y2="128" stroke="#000" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

function scoreLabel(won: boolean, score: number): string {
  if (!won) return "lost 💀";
  if (score === 0) return "perfect 🔥";
  if (score === 1) return `1 miss`;
  return `${score} misses`;
}

export default function HangmanPage() {
  const router = useRouter();
  const word = getDailyHangmanWord();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [friendResults, setFriendResults] = useState<GameResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const initialized = useRef(false);
  const savedRef = useRef(false);

  const wrongLetters = [...guessed].filter((l) => !word.includes(l));
  const wrongCount = wrongLetters.length;
  const isComplete = word.split("").every((l) => guessed.has(l));

  // Auth
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // Load saved
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    const restored = new Set<string>(saved.guessed ?? []);
    setGuessed(restored);
    if (saved.won) setStatus("won");
    else if (saved.lost) setStatus("lost");
  }, [word]);

  // Check win/lose
  useEffect(() => {
    if (status !== "playing") return;
    if (isComplete && guessed.size > 0) {
      setStatus("won");
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ won: true, guessed: [...guessed] }));
      if (currentUserId && !savedRef.current) {
        savedRef.current = true;
        saveGameResult(currentUserId, "hangman", true, wrongCount).catch(console.error);
      }
    } else if (wrongCount >= MAX_WRONG) {
      setStatus("lost");
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lost: true, guessed: [...guessed] }));
      if (currentUserId && !savedRef.current) {
        savedRef.current = true;
        saveGameResult(currentUserId, "hangman", false, wrongCount).catch(console.error);
      }
    }
  }, [guessed, status, isComplete, wrongCount, currentUserId]);

  // Load friend results when game ends
  useEffect(() => {
    if (status === "playing" || !currentUserId) return;
    setLoadingResults(true);
    getFriendsResults(currentUserId, "hangman")
      .then(setFriendResults)
      .catch(console.error)
      .finally(() => setLoadingResults(false));
  }, [status, currentUserId]);

  const guess = (letter: string) => {
    if (status !== "playing" || guessed.has(letter)) return;
    setGuessed((prev) => new Set([...prev, letter]));
  };

  const letterState = (letter: string): "correct" | "wrong" | "unused" => {
    if (!guessed.has(letter)) return "unused";
    return word.includes(letter) ? "correct" : "wrong";
  };

  return (
    <main style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>

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
        <p style={{ margin: 0, fontSize: "17px", fontWeight: 800, letterSpacing: "0.02em" }}>hangman</p>
        {status === "playing" ? (
          <>
            <span style={{ marginLeft: "auto", fontSize: "13px", color: wrongCount >= 4 ? "#e53935" : "#aaa", fontWeight: 600 }}>
              {wrongCount} / {MAX_WRONG}
            </span>
            {currentUserId && (
              <button
                onClick={() => setShowFriendPicker(true)}
                style={{
                  marginLeft: "12px", background: "none", border: "1px solid #e5e5e5",
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
          </>
        ) : (
          <span style={{ marginLeft: "auto" }} />
        )}
      </header>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 16px calc(20px + env(safe-area-inset-bottom))", overflowY: "auto" }}>

        {/* Hangman figure */}
        <div style={{ marginBottom: "12px" }}>
          <HangmanFigure wrongCount={status === "lost" ? MAX_WRONG : wrongCount} />
        </div>

        {/* Word display */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap", justifyContent: "center" }}>
          {word.split("").map((letter, i) => {
            const revealed = guessed.has(letter) || status === "lost";
            return (
              <div key={i} style={{ textAlign: "center" }}>
                <p style={{
                  margin: 0, fontSize: "22px", fontWeight: 800,
                  color: status === "lost" && !guessed.has(letter) ? "#e53935" : "#000",
                  minWidth: "22px", minHeight: "28px",
                  visibility: revealed ? "visible" : "hidden",
                }}>
                  {letter}
                </p>
                <div style={{ width: "22px", height: "2px", background: "#ddd", marginTop: "4px" }} />
              </div>
            );
          })}
        </div>

        {/* Keyboard */}
        {status === "playing" && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
            {KEYBOARD_ROWS.map((row) => (
              <div key={row} style={{ display: "flex", gap: "5px" }}>
                {row.split("").map((letter) => {
                  const state = letterState(letter);
                  return (
                    <button
                      key={letter}
                      onClick={() => guess(letter)}
                      disabled={state !== "unused"}
                      style={{
                        width: "30px", height: "40px", borderRadius: "7px", border: "none",
                        background: state === "correct" ? "#4a7c59" : state === "wrong" ? "#e5e5e5" : "#f0f0f0",
                        color: state === "correct" ? "#fff" : state === "wrong" ? "#ccc" : "#000",
                        fontSize: "13px", fontWeight: 700,
                        cursor: state === "unused" ? "pointer" : "default",
                        touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                        transition: "background 0.1s ease",
                      }}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Result */}
        {status !== "playing" && (
          <div style={{ width: "100%", maxWidth: "320px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {status === "won" ? (
              <div style={{ textAlign: "center", marginBottom: "8px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "30px" }}>🎉</p>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#4a7c59" }}>
                  {wrongCount === 0 ? "perfect!" : `${wrongCount} miss${wrongCount === 1 ? "" : "es"}`}
                </p>
              </div>
            ) : (
              <div style={{ textAlign: "center", marginBottom: "8px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "30px" }}>💀</p>
                <p style={{ margin: 0, fontSize: "14px", color: "#aaa" }}>better luck tomorrow</p>
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
                      if (a.won && b.won) return a.score - b.score;
                      return 0;
                    })
                    .map((r) => (
                      <div key={r.userId} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 0", borderBottom: "1px solid #f5f5f5",
                      }}>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#000" }}>@{r.username}</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: r.won ? "#4a7c59" : "#e53935" }}>
                          {scoreLabel(r.won, r.score)}
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
          game="hangman"
          userId={currentUserId}
          onClose={() => setShowFriendPicker(false)}
        />
      )}
    </main>
  );
}
