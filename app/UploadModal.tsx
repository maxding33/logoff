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
  if (!preview) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15,23,42,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 40,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "white",
          borderRadius: "28px",
          padding: "18px",
          boxShadow: "0 24px 60px rgba(15,23,42,0.22)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              color: "#0f172a",
            }}
          >
            New post
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "24px",
              cursor: "pointer",
              color: "#475569",
              minHeight: "44px",
              minWidth: "44px",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
            aria-label="Close upload modal"
          >
            ×
          </button>
        </div>

        <img
          src={preview}
          alt="Preview of selected upload"
          style={{
            width: "100%",
            aspectRatio: "4 / 5",
            objectFit: "cover",
            borderRadius: "20px",
            display: "block",
            marginBottom: "14px",
            backgroundColor: "#e2e8f0",
          }}
        />

        <textarea
          value={caption}
          onChange={(event) => onCaptionChange(event.target.value)}
          placeholder="Write a caption..."
          rows={4}
          style={{
            width: "100%",
            borderRadius: "18px",
            border: "1px solid #cbd5e1",
            padding: "14px",
            fontSize: "15px",
            resize: "none",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
            color: "#0f172a",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
            marginTop: "16px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #cbd5e1",
              backgroundColor: "white",
              color: "#0f172a",
              borderRadius: "999px",
              padding: "12px 16px",
              fontWeight: 600,
              cursor: "pointer",
              minHeight: "44px",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            style={{
              border: "none",
              backgroundColor: "#22c55e",
              color: "white",
              borderRadius: "999px",
              padding: "12px 18px",
              fontWeight: 700,
              cursor: "pointer",
              minHeight: "44px",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
