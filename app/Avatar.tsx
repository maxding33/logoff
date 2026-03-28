"use client";

import { useRef, useState, useEffect } from "react";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 55%)`;
}

export default function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const SIZE = size;
  const isCurrentUser = name === "You";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!isCurrentUser) return;
    try {
      const stored = localStorage.getItem("profilePhoto");
      if (stored) setProfilePhoto(stored);
    } catch {}
  }, [isCurrentUser]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setProfilePhoto(result);
        try {
          localStorage.setItem("profilePhoto", result);
        } catch {}
      }
    };
    reader.readAsDataURL(file);
  };

  const showPhoto = isCurrentUser && profilePhoto;

  return (
    <>
      <div
        onClick={isCurrentUser ? () => fileInputRef.current?.click() : undefined}
        title={isCurrentUser ? "Tap to set profile photo" : undefined}
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: "50%",
          backgroundColor: showPhoto ? "transparent" : getAvatarColor(name),
          backgroundImage: showPhoto ? `url(${profilePhoto})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          cursor: isCurrentUser ? "pointer" : "default",
          overflow: "hidden",
          touchAction: "manipulation",
        }}
      >
        {!showPhoto && (
          <span style={{ color: "#fff", fontSize: `${Math.round(SIZE * 0.35)}px`, fontWeight: 700, lineHeight: 1 }}>
            {getInitials(name)}
          </span>
        )}
      </div>
      {isCurrentUser && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          style={{ display: "none" }}
        />
      )}
    </>
  );
}
