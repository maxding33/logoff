"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDailyHangmanWord, todayKey } from "../../../lib/dailyGame";

const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const MAX_WRONG = 6;
const STORAGE_KEY = todayKey("hangman");

function HangmanFigure({ wrongCount }: { wrongCount: number }) {
  return (
    <svg width="130" height="160" viewBox="0 0 130 160" style={{ display: "block" }}>
      {/* Base */}
      <line x1="15" y1="150" x2="115" y2="150" stroke="#000" strokeWidth="3" strokeLinecap="round" />
      {/* Pole */}
      <line x1="45" y1="150" x2="45" y2="10" stroke="#000" strokeWidth="3" strokeLinecap="round" />
      {/* Top bar */}
      <line x1="45" y1="10" x2="90" y2="10" stroke="#000" strokeWidth="3" strokeLinecap="round" />
      {/* Rope */}
      <line x1="90" y1="10" x2="90" y2="30" stroke="#000" strokeWidth="2" strokeLinecap="round" />
      {/* Head */}
      {wrongCount >= 1 && (
        <circle cx="90" cy="42" r="12" stroke="#000" strokeWidth="2" fill="none" />
      )}
      {/* Body */}
      {wrongCount >= 2 && (
        <line x1="90" y1="54" x2="90" y2="100" stroke="#000" strokeWidth="2" strokeLinecap="round" />
      )}
      {/* Left arm */}
      {wrongCount >= 3 && (
        <line x1="90" y1="68" x2="68" y2="88" stroke="#000" strokeWidth="2" strokeLinecap="round" />
      )}
      {/* Right arm */}
      {wrongCount >= 4 && (
        <line x1="90" y1="68" x2="112" y2="88" stroke="#000" strokeWidth="2" strokeLinecap="round" />
      )}
      {/* Left leg */}
      {wrongCount >= 5 && (
        <line x1="90" y1="100" x2="68" y2="128" stroke="#000" strokeWidth="2" strokeLinecap="round" />
      )}
      {/* Right leg */}
      {wrongCount >= 6 && (
        <line x1="90" y1="100" x2="112" y2="128" stroke="#000" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

export default function HangmanPage() {
  const router = useRouter();
  const word = getDailyHangmanWord();

  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const initialized = useRef(false);

  const wrongLetters = [...guessed].filter((l) => !word.includes(l));
  const wrongCount = wrongLetters.length;
  const isComplete = word.split("").every((l) => guessed.has(l));

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
    if (isComplete) {
      setStatus("won");
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ won: true, guessed: [...guessed] }));
    } else if (wrongCount >= MAX_WRONG) {
      setStatus("lost");
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lost: true, guessed: [...guessed] }));
    }
  }, [guessed, status, isComplete, wrongCount]);

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
        <span style={{ marginLeft: "auto", fontSize: "13px", color: wrongCount >= 4 ? "#e53935" : "#aaa", fontWeight: 600 }}>
          {wrongCount} / {MAX_WRONG}
        </span>
      </header>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 16px calc(20px + env(safe-area-inset-bottom))" }}>

        {/* Hangman figure */}
        <div style={{ marginBottom: "16px" }}>
          <HangmanFigure wrongCount={wrongCount} />
        </div>

        {/* Word display */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "28px", flexWrap: "wrap", justifyContent: "center" }}>
          {word.split("").map((letter, i) => {
            const revealed = guessed.has(letter) || status === "lost";
            return (
              <div key={i} style={{ textAlign: "center" }}>
                <p style={{
                  margin: 0, fontSize: "22px", fontWeight: 800,
                  color: status === "lost" && !guessed.has(letter) ? "#e53935" : "#000",
                  minWidth: "24px", minHeight: "28px",
                  visibility: revealed ? "visible" : "hidden",
                }}>
                  {letter}
                </p>
                <div style={{ width: "24px", height: "2px", background: "#000", marginTop: "4px" }} />
              </div>
            );
          })}
        </div>

        {/* Status message */}
        {status !== "playing" && (
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            {status === "won" ? (
              <>
                <p style={{ margin: "0 0 4px", fontSize: "28px" }}>🎉</p>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#4a7c59" }}>you got it!</p>
              </>
            ) : (
              <>
                <p style={{ margin: "0 0 4px", fontSize: "28px" }}>💀</p>
                <p style={{ margin: 0, fontSize: "14px", color: "#aaa" }}>better luck tomorrow</p>
              </>
            )}
            <button
              onClick={() => router.back()}
              style={{
                marginTop: "16px", padding: "13px 32px", borderRadius: "14px",
                background: "#000", color: "#fff",
                border: "none", cursor: "pointer",
                fontSize: "14px", fontWeight: 700,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              done
            </button>
          </div>
        )}

        {/* Keyboard */}
        {status === "playing" && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
            {KEYBOARD_ROWS.map((row) => (
              <div key={row} style={{ display: "flex", gap: "6px" }}>
                {row.split("").map((letter) => {
                  const state = letterState(letter);
                  return (
                    <button
                      key={letter}
                      onClick={() => guess(letter)}
                      disabled={state !== "unused"}
                      style={{
                        width: "32px", height: "42px",
                        borderRadius: "8px",
                        border: "none",
                        background:
                          state === "correct" ? "#4a7c59" :
                          state === "wrong" ? "#e5e5e5" :
                          "#f0f0f0",
                        color:
                          state === "correct" ? "#fff" :
                          state === "wrong" ? "#ccc" :
                          "#000",
                        fontSize: "14px", fontWeight: 700,
                        cursor: state === "unused" ? "pointer" : "default",
                        touchAction: "manipulation",
                        WebkitTapHighlightColor: "transparent",
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

        {/* Wrong letters hint */}
        {status === "playing" && wrongLetters.length > 0 && (
          <p style={{ margin: "20px 0 0", fontSize: "12px", color: "#ccc", letterSpacing: "0.1em" }}>
            {wrongLetters.join("  ")}
          </p>
        )}
      </div>
    </main>
  );
}
