"use client";

type UploadModalProps = {
  preview: string | null;
  caption: string;
  onCaptionChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  posting?: boolean;
  error?: string | null;
  imageReady?: boolean;
};

export default function UploadModal({
  preview,
  caption,
  onCaptionChange,
  onClose,
  onSubmit,
  posting = false,
  error = null,
  imageReady = false,
}: UploadModalProps) {
  if (!preview) return null;

  const ready = imageReady && !posting;

  return (
    <div
      className="slide-up"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#ffffff",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        borderBottom: "1px solid #e5e5e5",
      }}>
        {/* X icon */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#000",
            padding: 0,
            minHeight: "44px",
            minWidth: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <span style={{ fontWeight: 700, fontSize: "14px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          new post
        </span>

        {/* Share pill button */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={!ready}
          style={{
            border: "none",
            background: "#000",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 700,
            cursor: ready ? "pointer" : "default",
            padding: "8px 18px",
            borderRadius: "999px",
            minHeight: "36px",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
            letterSpacing: "0.03em",
            opacity: ready ? 1 : 0.4,
            transition: "opacity 0.2s ease",
          }}
        >
          {posting ? "uploading..." : !imageReady ? "loading..." : "share"}
        </button>
      </div>

      {/* Photo */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", backgroundColor: "#f0f0f0" }}>
        <img
          src={preview}
          alt="Preview"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: imageReady ? 1 : 0,
            transition: "opacity 0.2s ease",
          }}
        />
        {!imageReady && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: "24px", height: "24px", borderRadius: "50%",
              border: "2px solid #e5e5e5",
              borderTopColor: "#000",
              animation: "uploadSpin 0.7s linear infinite",
            }} />
            <style>{`@keyframes uploadSpin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p style={{ margin: 0, padding: "10px 16px", fontSize: "13px", color: "#e53935", background: "#fff5f5", borderTop: "1px solid #fcc" }}>
          ⚠️ {error}
        </p>
      )}

      {/* Caption */}
      <textarea
        value={caption}
        onChange={(e) => onCaptionChange(e.target.value)}
        placeholder="write a caption..."
        rows={3}
        autoFocus
        style={{
          width: "100%",
          border: "none",
          borderTop: "1px solid #e5e5e5",
          padding: "14px 16px",
          fontSize: "16px",
          resize: "none",
          outline: "none",
          fontFamily: "inherit",
          color: "#000",
          backgroundColor: "#ffffff",
        }}
      />
    </div>
  );
}
