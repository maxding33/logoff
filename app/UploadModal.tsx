"use client";

type UploadModalProps = {
  preview: string | null;
  caption: string;
  onCaptionChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function UploadModal({
  preview,
  caption,
  onCaptionChange,
  onClose,
  onSubmit,
}: UploadModalProps) {
  if (!preview) return null;

  return (
    <div
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
        <button
          type="button"
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            fontSize: "14px",
            cursor: "pointer",
            color: "#000",
            padding: "4px",
            minHeight: "44px",
            minWidth: "44px",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          cancel
        </button>
        <span style={{ fontWeight: 700, fontSize: "14px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          new post
        </span>
        <button
          type="button"
          onClick={onSubmit}
          style={{
            border: "none",
            background: "transparent",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            color: "#000",
            padding: "4px",
            minHeight: "44px",
            minWidth: "44px",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          share
        </button>
      </div>

      {/* Photo */}
      <img
        src={preview}
        alt="Preview"
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          objectFit: "cover",
          display: "block",
          backgroundColor: "#f0f0f0",
        }}
      />

      {/* Caption */}
      <textarea
        value={caption}
        onChange={(e) => onCaptionChange(e.target.value)}
        placeholder="write a caption..."
        rows={3}
        style={{
          width: "100%",
          border: "none",
          borderTop: "1px solid #e5e5e5",
          padding: "14px 16px",
          fontSize: "14px",
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
