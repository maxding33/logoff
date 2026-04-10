"use client";

import { useState } from "react";
import { REPORT_REASONS, submitReport, type ReportTarget, type ReportReason } from "../lib/reports";

interface ReportSheetProps {
  target: ReportTarget | null;
  currentUserId: string;
  onClose: () => void;
}

const TITLE: Record<string, string> = {
  post: "report post",
  comment: "report comment",
  user: "report user",
  message: "report message",
};

export default function ReportSheet({ target, currentUserId, onClose }: ReportSheetProps) {
  const [selected, setSelected] = useState<ReportReason | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  if (!target) return null;

  const handleClose = () => {
    onClose();
    setTimeout(() => { setSelected(null); setStatus("idle"); }, 300);
  };

  const handleSubmit = async () => {
    if (!selected || status !== "idle") return;
    setStatus("submitting");
    try {
      await submitReport({
        reporterId: currentUserId,
        type: target.type,
        reason: selected,
        postId: target.type === "post" ? target.postId : undefined,
        commentId: target.type === "comment" ? target.commentId : undefined,
        reportedUserId: "reportedUserId" in target ? target.reportedUserId : undefined,
        messageId: target.type === "message" ? target.messageId : undefined,
      });
      setStatus("done");
      setTimeout(handleClose, 1800);
    } catch {
      setStatus("idle");
    }
  };

  return (
    <div
      onClick={handleClose}
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.4)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "#fff", borderRadius: "16px 16px 0 0",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
          animation: "slideUpSheet 0.28s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        <style>{`@keyframes slideUpSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {TITLE[target.type]}
          </span>
          <button
            onClick={handleClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", color: "#999", lineHeight: 1, padding: 0 }}
          >×</button>
        </div>

        {status === "done" ? (
          <div style={{ padding: "36px 20px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>thanks for letting us know</p>
            <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#999" }}>we'll review this report</p>
          </div>
        ) : (
          <>
            <div>
              {REPORT_REASONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelected(value)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "15px 20px",
                    border: "none", borderBottom: "1px solid #f5f5f5",
                    background: "transparent", cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: selected === value ? 700 : 400, color: "#000" }}>
                    {label}
                  </span>
                  {selected === value && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4a7c59" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <div style={{ padding: "16px 20px 0" }}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selected || status === "submitting"}
                style={{
                  width: "100%", padding: "14px",
                  background: selected ? "#000" : "#e5e5e5",
                  color: selected ? "#fff" : "#999",
                  border: "none", borderRadius: "999px",
                  fontSize: "14px", fontWeight: 700,
                  cursor: selected ? "pointer" : "default",
                  transition: "background 0.15s",
                }}
              >
                {status === "submitting" ? "submitting..." : "submit report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
