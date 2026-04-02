"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDailyAnagramWord, getScrambledLetters, todayKey } from "../../../lib/dailyGame";

type Tile = { id: number; letter: string; slotIndex: number | null };

const STORAGE_KEY = todayKey("anagram");

export default function AnagramPage() {
  const router = useRouter();
  const word = getDailyAnagramWord();
  const len = word.length;

  const [tiles, setTiles] = useState<Tile[]>(() =>
    getScrambledLetters(word).map((letter, i) => ({ id: i, letter, slotIndex: null }))
  );
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [shake, setShake] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const initialized = useRef(false);

  // Load saved state
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.won) {
      setTiles(word.split("").map((letter, i) => ({ id: i, letter, slotIndex: i })));
      setStatus("won");
    } else if (saved.lost) {
      setTiles(word.split("").map((letter, i) => ({ id: i, letter, slotIndex: i })));
      setStatus("lost");
      setReveal(true);
    }
  }, [word]);

  const getSlotLetter = (slotIdx: number) =>
    tiles.find((t) => t.slotIndex === slotIdx)?.letter ?? null;

  const filledCount = tiles.filter((t) => t.slotIndex !== null).length;
  const allFilled = filledCount === len;

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

  const check = () => {
    if (!allFilled || status !== "playing") return;
    const current = Array.from({ length: len }, (_, i) => getSlotLetter(i)).join("");
    if (current === word) {
      setStatus("won");
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ won: true, attempts: attempts + 1 }));
    } else {
      setAttempts((a) => a + 1);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const giveUp = () => {
    if (status !== "playing") return;
    setTiles(word.split("").map((letter, i) => ({ id: i, letter, slotIndex: i })));
    setStatus("lost");
    setReveal(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ won: false }));
  };

  const poolTiles = tiles.filter((t) => t.slotIndex === null);

  const slotColor = (slotIdx: number) => {
    const letter = getSlotLetter(slotIdx);
    if (!letter) return "#f5f5f5";
    if (status === "won") return "#eef6f1";
    if (status === "lost") return "#fef0f0";
    return "#000";
  };

  const slotTextColor = (slotIdx: number) => {
    const letter = getSlotLetter(slotIdx);
    if (!letter) return "transparent";
    if (status === "won") return "#4a7c59";
    if (status === "lost") return "#e53935";
    return "#fff";
  };

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
      </header>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px 40px", gap: "0" }}>

        {/* Prompt */}
        <p style={{ margin: "0 0 32px", fontSize: "13px", color: "#aaa", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {status === "playing" ? "unscramble the word" : status === "won" ? "you got it" : "the word was"}
        </p>

        {/* Answer slots */}
        <div
          style={{
            display: "flex", gap: "8px", marginBottom: "40px",
            animation: shake ? "shakeSlots 0.45s ease" : "none",
          }}
        >
          {Array.from({ length: len }, (_, i) => {
            const letter = getSlotLetter(i);
            return (
              <button
                key={i}
                onClick={() => tapSlot(i)}
                style={{
                  width: Math.min(46, Math.floor((window?.innerWidth ?? 390) - 48) / len - 8),
                  height: Math.min(52, Math.floor((window?.innerWidth ?? 390) - 48) / len - 4),
                  borderRadius: "10px",
                  background: slotColor(i),
                  border: letter ? "none" : "2px solid #e5e5e5",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "20px", fontWeight: 800, color: slotTextColor(i),
                  cursor: letter && status === "playing" ? "pointer" : "default",
                  transition: "background 0.15s ease",
                  animation: letter ? "popIn 0.15s ease" : "none",
                  minWidth: "36px", minHeight: "42px",
                }}
              >
                {letter}
              </button>
            );
          })}
        </div>

        {/* Tile pool */}
        {status === "playing" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginBottom: "40px", minHeight: "56px" }}>
            {poolTiles.map((tile) => (
              <button
                key={tile.id}
                onClick={() => tapPoolTile(tile.id)}
                style={{
                  width: "48px", height: "52px",
                  borderRadius: "10px",
                  background: "#f0f0f0",
                  border: "none",
                  fontSize: "20px", fontWeight: 800, color: "#000",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
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
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              check
            </button>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={clearAll}
                style={{
                  flex: 1, padding: "12px", borderRadius: "14px",
                  background: "#f5f5f5", color: "#888",
                  border: "none", cursor: "pointer",
                  fontSize: "14px", fontWeight: 600,
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                clear
              </button>
              <button
                onClick={giveUp}
                style={{
                  flex: 1, padding: "12px", borderRadius: "14px",
                  background: "#f5f5f5", color: "#888",
                  border: "none", cursor: "pointer",
                  fontSize: "14px", fontWeight: 600,
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                reveal
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {status !== "playing" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", marginTop: "8px" }}>
            {status === "won" && (
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: "0 0 4px", fontSize: "32px" }}>🎉</p>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#4a7c59" }}>
                  {attempts === 0 ? "first try!" : `got it in ${attempts + 1} tries`}
                </p>
              </div>
            )}
            {status === "lost" && (
              <p style={{ margin: 0, fontSize: "14px", color: "#aaa", textAlign: "center" }}>
                better luck tomorrow
              </p>
            )}
            <button
              onClick={() => router.back()}
              style={{
                marginTop: "8px", padding: "13px 32px", borderRadius: "14px",
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

        {/* Attempts indicator */}
        {status === "playing" && attempts > 0 && (
          <p style={{ margin: "20px 0 0", fontSize: "12px", color: "#ccc" }}>
            {attempts} wrong {attempts === 1 ? "try" : "tries"}
          </p>
        )}
      </div>
    </main>
  );
}
