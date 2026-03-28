"use client";

import { ChangeEvent, RefObject } from "react";
import Link from "next/link";

type BottomNavProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  handlePhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export default function BottomNav({ fileInputRef, handlePhotoChange }: BottomNavProps) {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e5e5e5",
        padding: "14px 40px calc(14px + env(safe-area-inset-bottom))",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 30,
      }}
    >
      {/* Home */}
      <Link href="/" style={{ color: "#000", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "44px", minHeight: "44px", touchAction: "manipulation" }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
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
          style={{
            position: "absolute",
            inset: 0,
            width: "1px",
            height: "1px",
            opacity: 0,
            cursor: "pointer",
          }}
        />
      </label>

      {/* Profile */}
      <Link href="/profile" style={{ color: "#000", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "44px", minHeight: "44px", touchAction: "manipulation" }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </Link>
    </nav>
  );
}
