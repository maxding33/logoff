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
  const containerRef = useRef<HTMLDivElement>(null);
  const gestureClaimedBy = useRef<string | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const direction = useRef<"horiz" | "vert" | null>(null);
  const dragging = useRef(false);
  const springRaf = useRef<number | null>(null);
  // Track last few touch samples for instantaneous velocity
  const touchSamples = useRef<{ x: number; t: number }[]>([]);

  // Cancel any running spring animation
  const cancelSpring = () => {
    if (springRaf.current !== null) {
      cancelAnimationFrame(springRaf.current);
      springRaf.current = null;
    }
  };

  // Spring-physics animation: carries finger momentum, decelerates naturally
  const animateSpring = (from: number, to: number, initialVelocity: number) => {
    cancelSpring();
    const stiffness = 260;
    const damping = 28;
    const mass = 1;
    let pos = from;
    let vel = initialVelocity * 1000; // px/ms → px/s
    let lastT = performance.now();
    const startT = lastT;

    const snap = () => {
      if (sliderRef.current) {
        sliderRef.current.style.transition = "none";
        sliderRef.current.style.transform = `translateX(${to}px)`;
      }
      springRaf.current = null;
    };

    const step = (now: number) => {
      const dt = Math.min((now - lastT) / 1000, 0.032);
      lastT = now;

      const displacement = pos - to;
      const springForce = -stiffness * displacement;
      const dampingForce = -damping * vel;
      vel += ((springForce + dampingForce) / mass) * dt;
      pos += vel * dt;

      // Settle: close enough or max 600ms safety
      if ((Math.abs(vel) < 0.5 && Math.abs(pos - to) < 0.3) || (now - startT > 600)) {
        snap();
        return;
      }

      if (sliderRef.current) {
        sliderRef.current.style.transition = "none";
        sliderRef.current.style.transform = `translateX(${pos}px)`;
      }
      springRaf.current = requestAnimationFrame(step);
    };

    springRaf.current = requestAnimationFrame(step);
  };

  // Keep slider in sync with pageIndex (for programmatic taps like BottomNav)
  // Skip if a spring animation is running — it handles positioning itself
  useEffect(() => {
    if (!sliderRef.current || springRaf.current !== null) return;
    sliderRef.current.style.transition = "transform 0.48s cubic-bezier(0.16, 1, 0.3, 1)";
    sliderRef.current.style.transform = `translateX(${-pageIndex * window.innerWidth}px)`;
  }, [pageIndex]);

  // Handle window resize (e.g. orientation change)
  useEffect(() => {
    const onResize = () => {
      if (!sliderRef.current) return;
      cancelSpring();
      sliderRef.current.style.transition = "none";
      sliderRef.current.style.transform = `translateX(${-pageIndex * window.innerWidth}px)`;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pageIndex]);

  // Attach touchmove as non-passive so e.preventDefault() works to block vertical scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", handleTouchMove);
  });

  const setPageIndex = (index: number) => {
    setPageIndexState(index);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't cancel spring here — only cancel when a drag actually begins.
    // This prevents stranding the slider at a mid-position if the touch
    // turns out to be a tap or vertical scroll.
    gestureClaimedBy.current = null;
    direction.current = null;
    dragging.current = false;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchSamples.current = [{ x: e.touches[0].clientX, t: Date.now() }];
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStart.current || gestureClaimedBy.current) return;
    const cx = e.touches[0].clientX;
    const dx = cx - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;

    if (!direction.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      direction.current = Math.abs(dx) > Math.abs(dy) ? "horiz" : "vert";
    }

    if (direction.current !== "horiz") return;

    // No valid destination — ignore entirely so page stays locked
    if (pageIndex === 0 && dx > 0) return; // Home, swiping right — nowhere to go
    if (pageIndex === 1 && dx < 0) return; // Profile, swiping left — nowhere to go

    // Lock out vertical scrolling for the duration of this horizontal gesture
    e.preventDefault();

    // First horizontal movement — cancel any running spring and take over
    if (!dragging.current) {
      cancelSpring();
      if (sliderRef.current) sliderRef.current.style.transition = "none";
    }
    dragging.current = true;

    // Keep last 4 samples for velocity calculation
    const now = Date.now();
    touchSamples.current.push({ x: cx, t: now });
    if (touchSamples.current.length > 4) touchSamples.current.shift();

    const base = -pageIndex * window.innerWidth;
    const raw = base + dx;
    const offset = Math.max(-window.innerWidth, Math.min(0, raw));
    if (sliderRef.current) sliderRef.current.style.transform = `translateX(${offset}px)`;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || !dragging.current || gestureClaimedBy.current) {
      // Safety: if we didn't drag, ensure slider is at exact page position
      // (covers case where a tap/scroll interrupted a running spring)
      if (sliderRef.current && springRaf.current === null) {
        sliderRef.current.style.transition = "none";
        sliderRef.current.style.transform = `translateX(${-pageIndex * window.innerWidth}px)`;
      }
      touchStart.current = null;
      dragging.current = false;
      return;
    }

    const dx = e.changedTouches[0].clientX - touchStart.current.x;

    // Calculate instantaneous velocity from recent samples
    const samples = touchSamples.current;
    let releaseVelocity = 0; // px/ms, positive = rightward
    if (samples.length >= 2) {
      const last = samples[samples.length - 1];
      const prev = samples[Math.max(0, samples.length - 3)];
      const sdt = last.t - prev.t;
      if (sdt > 0) releaseVelocity = (last.x - prev.x) / sdt;
    }

    const threshold = window.innerWidth * 0.18;
    let newIndex = pageIndex;

    // Fast flick (>0.35 px/ms) or past distance threshold
    if ((dx < -threshold || (dx < -20 && releaseVelocity < -0.35)) && pageIndex === 0) newIndex = 1;
    else if ((dx > threshold || (dx > 20 && releaseVelocity > 0.35)) && pageIndex === 1) newIndex = 0;

    // Current position of the slider
    const currentOffset = -pageIndex * window.innerWidth + dx;
    const targetOffset = -newIndex * window.innerWidth;

    // Spring animate from current position with finger's release velocity
    animateSpring(currentOffset, targetOffset, releaseVelocity);
    setPageIndex(newIndex);
    touchStart.current = null;
    dragging.current = false;
  };

  return (
    <PageContext.Provider value={{ pageIndex, setPageIndex, gestureClaimedBy }}>
      <div
        ref={containerRef}
        style={{ height: "100vh", overflow: "hidden", position: "relative" }}
        onTouchStart={handleTouchStart}
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
