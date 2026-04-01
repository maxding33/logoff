import { useEffect, useState } from "react";

export type EndOfDayFriend = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  missedThisMonth: number;
};

export type OnFireFriend = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  streak: number;
};

export type EndOfDaySummary = {
  windowDate: string;
  didntMakeIt: EndOfDayFriend[];
  onFire: OnFireFriend[];
};

let cachedSummary: EndOfDaySummary | null = null;
let cachedShouldShow = false;
let cachedAt: number | null = null;

export function useEndOfDaySummary(userId?: string | null): { shouldShow: boolean; summary: EndOfDaySummary | null } {
  const [shouldShow, setShouldShow] = useState(cachedShouldShow);
  const [summary, setSummary] = useState<EndOfDaySummary | null>(cachedSummary);

  useEffect(() => {
    if (!userId) return;
    if (cachedAt && Date.now() - cachedAt < 10 * 60 * 1000) return;

    fetch(`/api/end-of-day-summary?userId=${userId}`)
      .then((r) => r.json())
      .then(({ shouldShow: show, windowDate, didntMakeIt, onFire }) => {
        const hasContent = (didntMakeIt?.length ?? 0) > 0 || (onFire?.length ?? 0) > 0;
        cachedShouldShow = !!show && hasContent;
        cachedSummary = cachedShouldShow ? { windowDate, didntMakeIt: didntMakeIt ?? [], onFire: onFire ?? [] } : null;
        cachedAt = Date.now();
        setShouldShow(cachedShouldShow);
        setSummary(cachedSummary);
      })
      .catch(() => {});
  }, [userId]);

  return { shouldShow, summary };
}
