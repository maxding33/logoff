import { useEffect, useState } from "react";

export function useChallengeTimer(): string | null {
  const [endsAt, setEndsAt] = useState<Date | null>(null);
  const [display, setDisplay] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/challenge-status")
      .then((r) => r.json())
      .then(({ active, endsAt: end }) => {
        if (active && end) setEndsAt(new Date(end));
      });
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
