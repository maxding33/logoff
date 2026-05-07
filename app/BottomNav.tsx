"use client";

import { ChangeEvent, RefObject, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePageContext } from "./PageContext";

type BottomNavProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  handlePhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  cameraOnly?: boolean;
  onGamePress?: () => void;
};

export default function BottomNav({ fileInputRef, handlePhotoChange, cameraOnly, onGamePress }: BottomNavProps) {
  const { pageIndex, setPageIndex } = usePageContext();
  const [tapped, setTapped] = useState<"home" | "profile" | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      setKeyboardOpen(vv.height < window.innerHeight * 0.75);
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  const handleTap = (icon: "home" | "profile") => {
    setTapped(icon);
    setTimeout(() => setTapped(null), 400);
  };

  if (keyboardOpen) return null;

  // Only show this BottomNav instance when its page is active
  const isHome = pageIndex === 0;

  // Portal to document.body so position:fixed escapes any transform ancestor
  return createPortal(
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e5e5e5",
        padding: "16px 60px calc(18px + env(safe-area-inset-bottom))",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 30,
      }}
    >
      {/* Home */}
      <button
        onClick={() => { handleTap("home"); setPageIndex(0); }}
        style={{
          background: "none",
          border: "none",
          color: tapped === "home" ? "#4a7c59" : isHome ? "#000" : "#aaa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "64px",
          minHeight: "56px",
          touchAction: "manipulation",
          transition: "color 0.15s ease",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <svg
          width="30" height="30" viewBox="0 0 24 24"
          fill={isHome ? "currentColor" : "none"}
          stroke="currentColor" strokeWidth="1.75"
          strokeLinecap="round" strokeLinejoin="round"
          className={tapped === "home" ? "nav-tap" : ""}
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" fill="none" />
          {isHome && <rect x="9" y="12" width="6" height="10" fill="#4a7c59" stroke="none" />}
        </svg>
      </button>

      {/* Center button — game icon or upload */}
      {onGamePress ? (
        <button
          onClick={onGamePress}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "54px", height: "54px", borderRadius: "50%",
            backgroundColor: "#000", color: "#fff",
            border: "none", cursor: "pointer",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
          aria-label="Open games"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="9" height="9" rx="2" />
            <rect x="13" y="2" width="9" height="9" rx="2" />
            <rect x="2" y="13" width="9" height="9" rx="2" />
            <rect x="13" y="13" width="9" height="9" rx="2" />
          </svg>
        </button>
      ) : (
        <label
          htmlFor="photo-upload"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "54px", height: "54px", borderRadius: "50%",
            backgroundColor: "#000000", color: "#ffffff",
            fontSize: "24px", cursor: "pointer", lineHeight: 1,
          }}
          aria-label="Upload a photo"
        >
          <span aria-hidden="true">+</span>
          <input
            ref={fileInputRef}
            id="photo-upload"
            type="file"
            accept="image/*"
            {...(cameraOnly ? { capture: "environment" } : {})}
            onChange={handlePhotoChange}
            style={{ display: "none" }}
          />
        </label>
      )}

      {/* Profile */}
      <button
        onClick={() => { handleTap("profile"); setPageIndex(1); }}
        style={{
          background: "none",
          border: "none",
          color: tapped === "profile" ? "#4a7c59" : !isHome ? "#000" : "#aaa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "64px",
          minHeight: "56px",
          touchAction: "manipulation",
          transition: "color 0.15s ease",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <svg
          width="30" height="30" viewBox="0 0 24 24"
          fill={!isHome ? "currentColor" : "none"}
          stroke="currentColor" strokeWidth="1.75"
          strokeLinecap="round" strokeLinejoin="round"
          className={tapped === "profile" ? "nav-tap" : ""}
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>
    </nav>,
    document.body
  );
}
