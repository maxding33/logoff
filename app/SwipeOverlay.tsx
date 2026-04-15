"use client";

import { useRef, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

export default function SwipeOverlay({
  children,
  backTo,
  zIndex = 50,
  slideIn = true,
}: {
  children: ReactNode;
  backTo: string;
  zIndex?: number;
  slideIn?: boolean;
}) {
  const router = useRouter();
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const directionLocked = useRef<"horizontal" | "vertical" | null>(null);
  const mountTime = useRef(Date.now());
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (Date.now() - mountTime.current < 300) return;
    const touch = e.touches[0];
    swipeStart.current = { x: touch.clientX, y: touch.clientY };
    directionLocked.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeStart.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - swipeStart.current.x;
    const dy = Math.abs(touch.clientY - swipeStart.current.y);
    if (!directionLocked.current && (dx > 10 || dy > 10)) {
      directionLocked.current = dx > dy ? "horizontal" : "vertical";
    }
    if (directionLocked.current === "vertical") { swipeStart.current = null; return; }
    if (directionLocked.current === "horizontal" && dx > 10) {
      setSwiping(true);
      setSwipeX(Math.max(0, dx));
    }
  };

  const handleTouchEnd = () => {
    if (!swipeStart.current || !swiping) { swipeStart.current = null; return; }
    if (swipeX > 100) {
      setExiting(true);
      setTimeout(() => router.push(backTo), 200);
    } else {
      setSwipeX(0);
      setSwiping(false);
    }
    swipeStart.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed", inset: 0, zIndex,
        background: "#fff", overflowY: "auto",
        animation: slideIn && !exiting ? "slideInRight 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)" : undefined,
        transform: swiping || exiting ? `translateX(${exiting ? "100%" : `${swipeX}px`})` : undefined,
        transition: swiping ? undefined : "transform 0.2s ease",
        boxShadow: swiping || exiting ? "-4px 0 16px rgba(0,0,0,0.1)" : undefined,
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(15%); opacity: 0.6; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      {children}
    </div>
  );
}
