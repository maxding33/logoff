import { useEffect, useState } from "react";

let cachedEndsAt: Date | null = null;
let fetchedAt: number | null = null;
const listeners = new Set<(endsAt: Date | null) => void>();

async function fetchChallengeStatus(userId?: string | null): Promise<Date | null> {
  if (!userId && cachedEndsAt && fetchedAt && Date.now() - fetchedAt < 60_000) {
    return cachedEndsAt;
  }
  const url = userId ? `/api/challenge-status?userId=${userId}` : "/api/challenge-status";
  const res = await fetch(url);
  const { active, endsAt, completed } = await res.json();
  cachedEndsAt = active && endsAt && !completed ? new Date(endsAt) : null;
  fetchedAt = Date.now();
  return cachedEndsAt;
}

export function useChallengeTimer(userId?: string | null): string | null {
  const [endsAt, setEndsAt] = useState<Date | null>(cachedEndsAt);
  const [display, setDisplay] = useState<string | null>(null);

  useEffect(() => {
    listeners.add(setEndsAt);
    return () => { listeners.delete(setEndsAt); };
  }, []);

  useEffect(() => {
    fetchChallengeStatus(userId).then(setEndsAt);

    // Re-check every 5 minutes in case the notification fires while app is open
    const interval = setInterval(() => {
      fetchedAt = null;
      fetchChallengeStatus(userId).then(setEndsAt);
    }, 5 * 60 * 1000);

    // Re-check when app comes back into focus (e.g. after receiving notification)
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchedAt = null;
        fetchChallengeStatus(userId).then(setEndsAt);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
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

// Call after a successful post — re-fetches and notifies all mounted hooks
export async function recheckChallengeStatus(userId: string) {
  fetchedAt = null;
  const endsAt = await fetchChallengeStatus(userId);
  listeners.forEach((fn) => fn(endsAt));
}
