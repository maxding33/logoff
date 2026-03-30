"use client";

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

export default function Avatar({
  name,
  size = 34,
  avatarUrl,
}: {
  name: string;
  size?: number;
  avatarUrl?: string | null;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: avatarUrl ? "transparent" : getAvatarColor(name),
        backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {!avatarUrl && (
        <span style={{ color: "#fff", fontSize: `${Math.round(size * 0.35)}px`, fontWeight: 700, lineHeight: 1 }}>
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}
