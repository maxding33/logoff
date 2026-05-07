"use client";

import { useRef, useState, useEffect } from "react";
import HomeContent from "../HomeContent";
import ProfileContent from "../ProfileContent";
import { PageContext } from "../PageContext";

export default function HomeLayout({
  children,
  messages,
  profile,
  search,
  user,
}: {
  children: React.ReactNode;
  messages: React.ReactNode;
  profile: React.ReactNode;
  search: React.ReactNode;
  user: React.ReactNode;
}) {
  const [pageIndex, setPageIndexState] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const gestureClaimedBy = useRef<string | null>(null);
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const direction = useRef<"horiz" | "vert" | null>(null);
  const dragging = useRef(false);

  // Keep slider in sync with pageIndex (for programmatic changes like BottomNav taps)
  useEffect(() => {
    if (!sliderRef.current) return;
    sliderRef.current.style.transition = "none";
    sliderRef.current.style.transform = `translateX(${-pageIndex * window.innerWidth}px)`;
  }, [pageIndex]);

  // Handle window resize (e.g. orientation change)
  useEffect(() => {
    const onResize = () => {
      if (!sliderRef.current) return;
      sliderRef.current.style.transition = "none";
      sliderRef.current.style.transform = `translateX(${-pageIndex * window.innerWidth}px)`;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pageIndex]);

  const setPageIndex = (index: number, animate = false, durationMs?: number) => {
    setPageIndexState(index);
    if (sliderRef.current) {
      const dur = durationMs ?? 420;
      sliderRef.current.style.transition = animate
        ? `transform ${dur}ms cubic-bezier(0.16, 1, 0.3, 1)`
        : "none";
      sliderRef.current.style.transform = `translateX(${-index * window.innerWidth}px)`;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    gestureClaimedBy.current = null;
    direction.current = null;
    dragging.current = false;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    if (sliderRef.current) sliderRef.current.style.transition = "none";
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || gestureClaimedBy.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;

    if (!direction.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      direction.current = Math.abs(dx) > Math.abs(dy) ? "horiz" : "vert";
    }

    if (direction.current !== "horiz") return;

    dragging.current = true;
    const base = -pageIndex * window.innerWidth;
    const raw = base + dx;
    // Clamp — can't go past edges
    const offset = Math.max(-window.innerWidth, Math.min(0, raw));
    if (sliderRef.current) sliderRef.current.style.transform = `translateX(${offset}px)`;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || !dragging.current || gestureClaimedBy.current) {
      touchStart.current = null;
      dragging.current = false;
      return;
    }

    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dt = Date.now() - touchStart.current.t;
    const velocity = Math.abs(dx) / Math.max(dt, 1); // px/ms
    const threshold = window.innerWidth * 0.18;
    let newIndex = pageIndex;

    // Fast flick (>0.4 px/ms) or past distance threshold
    if ((dx < -threshold || (dx < -30 && velocity > 0.4)) && pageIndex === 0) newIndex = 1;
    else if ((dx > threshold || (dx > 30 && velocity > 0.4)) && pageIndex === 1) newIndex = 0;

    // Velocity-aware duration: fast flick → short; slow release → longer glide
    const remaining = Math.abs(-newIndex * window.innerWidth - (-pageIndex * window.innerWidth + dx));
    const baseDur = velocity > 0.6 ? 260 : velocity > 0.3 ? 340 : 420;
    const dur = Math.max(200, Math.min(baseDur, remaining / Math.max(velocity, 0.3)));

    setPageIndex(newIndex, true, dur);
    touchStart.current = null;
    dragging.current = false;
  };

  return (
    <PageContext.Provider value={{ pageIndex, setPageIndex: (i) => setPageIndex(i, false), gestureClaimedBy }}>
      <div
        style={{ height: "100vh", overflow: "hidden", position: "relative" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={sliderRef}
          style={{ display: "flex", width: "200%", height: "100%", willChange: "transform" }}
        >
          <div style={{ width: "50%", height: "100%" }}>
            <HomeContent />
          </div>
          <div style={{ width: "50%", height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
            <ProfileContent />
          </div>
        </div>
      </div>
      {messages}
      {search}
      {user}
    </PageContext.Provider>
  );
}
