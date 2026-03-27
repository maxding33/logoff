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
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e5e5e5",
        padding: "10px 20px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 30,
      }}
    >
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
    </nav>
  );
}
