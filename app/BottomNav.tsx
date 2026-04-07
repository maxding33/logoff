"use client";

import { ChangeEvent, RefObject, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type BottomNavProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  handlePhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  cameraOnly?: boolean;
  onGamePress?: () => void;
};

export default function BottomNav({ fileInputRef, handlePhotoChange, cameraOnly, onGamePress }: BottomNavProps) {
  const pathname = usePathname();
  const [tapped, setTapped] = useState<"home" | "profile" | null>(null);

  const handleTap = (icon: "home" | "profile") => {
    setTapped(icon);
    setTimeout(() => setTapped(null), 400);
  };

  return (
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
      <Link
        href="/"
        onClick={() => handleTap("home")}
        style={{
          color: tapped === "home" ? "#4a7c59" : pathname === "/" ? "#000" : "#aaa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "52px",
          minHeight: "52px",
          touchAction: "manipulation",
          transition: "color 0.15s ease",
        }}
      >
        <svg
          width="26" height="26" viewBox="0 0 24 24"
          fill={pathname === "/" ? "currentColor" : "none"}
          stroke="currentColor" strokeWidth="1.75"
          strokeLinecap="round" strokeLinejoin="round"
          className={tapped === "home" ? "nav-tap" : ""}
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" fill="none" />
          {pathname === "/" && <rect x="9" y="12" width="6" height="10" fill="#4a7c59" stroke="none" />}
        </svg>
      </Link>

      {/* Center button — game icon or upload */}
      {onGamePress ? (
        <button
          onClick={onGamePress}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "52px", height: "52px", borderRadius: "50%",
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
            width: "52px", height: "52px", borderRadius: "50%",
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
      <Link
        href="/profile"
        onClick={() => handleTap("profile")}
        style={{
          color: tapped === "profile" ? "#4a7c59" : pathname === "/profile" ? "#000" : "#aaa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "52px",
          minHeight: "52px",
          touchAction: "manipulation",
          transition: "color 0.15s ease",
        }}
      >
        <svg
          width="26" height="26" viewBox="0 0 24 24"
          fill={pathname === "/profile" ? "currentColor" : "none"}
          stroke="currentColor" strokeWidth="1.75"
          strokeLinecap="round" strokeLinejoin="round"
          className={tapped === "profile" ? "nav-tap" : ""}
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </Link>
    </nav>
  );
}
