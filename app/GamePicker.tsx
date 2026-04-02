"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { todayKey } from "../lib/dailyGame";

type GameInfo = {
  slug: string;
  name: string;
  description: string;
  available: boolean;
};

const GAMES: GameInfo[] = [
  { slug: "anagram", name: "anagram", description: "unscramble the daily word", available: true },
  { slug: "hangman", name: "hangman", description: "guess the word, letter by letter", available: true },
  { slug: "crossword", name: "crossword", description: "coming soon", available: false },
  { slug: "trivia", name: "trivia", description: "coming soon", available: false },
];

export default function GamePicker({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const today = new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const [results, setResults] = useState<Record<string, { won: boolean } | null>>({});

  useEffect(() => {
    const loaded: Record<string, { won: boolean } | null> = {};
    for (const game of GAMES) {
      const raw = localStorage.getItem(todayKey(game.slug));
      loaded[game.slug] = raw ? JSON.parse(raw) : null;
    }
    setResults(loaded);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "#fff",
      display: "flex", flexDirection: "column",
      animation: "gamepickerSlideUp 0.28s cubic-bezier(0.32,0.72,0,1)",
    }}>
      <style>{`
        @keyframes gamepickerSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid #e5e5e5",
        flexShrink: 0,
      }}>
        <div>
          <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, letterSpacing: "0.02em" }}>games</p>
          <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#aaa" }}>{today}</p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer", color: "#000",
            display: "flex", alignItems: "center", justifyContent: "center",
            minWidth: "44px", minHeight: "44px",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Game cards */}
      <div style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto" }}>
        {GAMES.map((game) => {
          const result = results[game.slug] ?? null;
          return (
            <button
              key={game.slug}
              onClick={() => {
                if (!game.available) return;
                onClose();
                router.push(`/game/${game.slug}`);
              }}
              disabled={!game.available}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "20px 20px",
                border: `1px solid ${game.available ? "#e0e0e0" : "#f0f0f0"}`,
                borderRadius: "18px",
                background: game.available ? "#fff" : "#fafafa",
                cursor: game.available ? "pointer" : "default",
                textAlign: "left",
                opacity: game.available ? 1 : 0.4,
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#000", letterSpacing: "0.01em" }}>
                  {game.name}
                </p>
                <p style={{ margin: "5px 0 0", fontSize: "13px", color: "#aaa", lineHeight: 1.3 }}>
                  {game.description}
                </p>
              </div>
              <div style={{ flexShrink: 0, marginLeft: "12px" }}>
                {result !== null ? (
                  <span style={{
                    fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em",
                    color: result.won ? "#4a7c59" : "#e53935",
                    background: result.won ? "#eef6f1" : "#fef0f0",
                    padding: "5px 12px", borderRadius: "999px",
                  }}>
                    {result.won ? "done ✓" : "tried"}
                  </span>
                ) : game.available ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                ) : (
                  <span style={{ fontSize: "11px", color: "#ccc", letterSpacing: "0.06em" }}>soon</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p style={{
        textAlign: "center", fontSize: "11px", color: "#ccc",
        padding: "0 0 calc(20px + env(safe-area-inset-bottom))",
        margin: 0, flexShrink: 0,
      }}>
        new puzzles every day
      </p>
    </div>
  );
}
