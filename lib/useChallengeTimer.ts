import { useEffect, useState } from "react";

// Module-level cache so switching tabs doesn't re-fetch or flicker
let cachedEndsAt: Date | null = null;
let fetchedAt: number | null = null;

async function fetchChallengeStatus(): Promise<Date | null> {
  // Reuse cache if fetched within the last 60 seconds
  if (cachedEndsAt && fetchedAt && Date.now() - fetchedAt < 60_000) {
    return cachedEndsAt;
  }
  const res = await fetch("/api/challenge-status");
  const { active, endsAt } = await res.json();
  cachedEndsAt = active && endsAt ? new Date(endsAt) : null;
  fetchedAt = Date.now();
  return cachedEndsAt;
}

export function useChallengeTimer(): string | null {
  const [endsAt, setEndsAt] = useState<Date | null>(cachedEndsAt);
  const [display, setDisplay] = useState<string | null>(null);

  useEffect(() => {
    fetchChallengeStatus().then(setEndsAt);
  }, []);

  useEffect(() => {
    if (!endsAt) return;

    const tick = () => {
      const secsLeft = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 1000));
      if (secsLeft === 0) {
        setDisplay(null);
        return;
      }
      const m = String(Math.floor(secsLeft / 60)).padStart(2, "0");
      const s = String(secsLeft % 60).padStart(2, "0");
      setDisplay(`${m}:${s}`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return display;
}
