"use client";

import { ChangeEvent, RefObject, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type BottomNavProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  handlePhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export default function BottomNav({ fileInputRef, handlePhotoChange }: BottomNavProps) {
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
        padding: "14px 70px calc(14px + env(safe-area-inset-bottom))",
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
          minWidth: "44px",
          minHeight: "44px",
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

      {/* Upload */}
      <label
        htmlFor="photo-upload"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          backgroundColor: "#000000",
          color: "#ffffff",
          fontSize: "24px",
          cursor: "pointer",
          lineHeight: 1,
        }}
        aria-label="Upload a photo"
      >
        <span aria-hidden="true">+</span>
        <input
          ref={fileInputRef}
          id="photo-upload"
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          style={{ display: "none" }}
        />
      </label>

      {/* Profile */}
      <Link
        href="/profile"
        onClick={() => handleTap("profile")}
        style={{
          color: tapped === "profile" ? "#4a7c59" : pathname === "/profile" ? "#000" : "#aaa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "44px",
          minHeight: "44px",
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
