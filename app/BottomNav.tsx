"use client";

import { ChangeEvent, RefObject } from "react";

type BottomNavProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  handlePhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export default function BottomNav({
  fileInputRef,
  handlePhotoChange,
}: BottomNavProps) {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: "18px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: "398px",
        backgroundColor: "rgba(24,24,27,0.96)",
        color: "white",
        borderRadius: "999px",
        padding: "14px 20px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
        backdropFilter: "blur(12px)",
        zIndex: 30,
      }}
    >
      <label
        htmlFor="photo-upload"
        style={{
          fontSize: "26px",
          color: "white",
          cursor: "pointer",
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          width: "52px",
          height: "52px",
          borderRadius: "999px",
          backgroundColor: "#22c55e",
          fontWeight: 700,
        }}
        aria-label="Upload a photo"
      >
        <span aria-hidden="true">＋</span>
        <input
          ref={fileInputRef}
          id="photo-upload"
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
          }}
        />
      </label>
    </nav>
  );
}