import { useEffect, useState } from "react";

let cachedEndsAt: Date | null = null;
let cachedCompleted = false;
let fetchedAt: number | null = null;

async function fetchChallengeStatus(userId?: string | null): Promise<{ endsAt: Date | null; completed: boolean }> {
  if (!userId && cachedEndsAt && fetchedAt && Date.now() - fetchedAt < 60_000) {
    return { endsAt: cachedEndsAt, completed: cachedCompleted };
  }
  const url = userId ? `/api/challenge-status?userId=${userId}` : "/api/challenge-status";
  const res = await fetch(url);
  const { active, endsAt, completed } = await res.json();
  cachedEndsAt = active && endsAt ? new Date(endsAt) : null;
  cachedCompleted = completed ?? false;
  fetchedAt = Date.now();
  return { endsAt: cachedEndsAt, completed: cachedCompleted };
}

export function useChallengeTimer(userId?: string | null): string | null {
  const [endsAt, setEndsAt] = useState<Date | null>(cachedEndsAt);
  const [display, setDisplay] = useState<string | null>(null);

  useEffect(() => {
    fetchChallengeStatus(userId).then(({ endsAt: end }) => setEndsAt(end));
  }, [userId]);

  useEffect(() => {
    if (!endsAt) { setDisplay(null); return; }

    const tick = () => {
      const secsLeft = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 1000));
      if (secsLeft === 0) { setDisplay(null); return; }
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

// Call this after a successful post to re-check and clear the timer
export function recheckChallengeStatus(userId: string) {
  fetchedAt = null; // invalidate cache
  return fetchChallengeStatus(userId);
}
