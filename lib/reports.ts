import { supabase } from "./supabase";

export type ReportType = "post" | "comment" | "user" | "message";
export type ReportReason = "harassment" | "spam" | "inappropriate" | "impersonation" | "other";

export type ReportTarget =
  | { type: "post"; postId: string; reportedUserId?: string }
  | { type: "comment"; commentId: string; reportedUserId?: string }
  | { type: "user"; reportedUserId: string }
  | { type: "message"; messageId: string; reportedUserId?: string };

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "harassment", label: "Harassment or abuse" },
  { value: "spam", label: "Spam" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Other" },
];

interface ReportPayload {
  reporterId: string;
  type: ReportType;
  reason: ReportReason;
  postId?: string;
  commentId?: string;
  reportedUserId?: string;
  messageId?: string;
}

export async function submitReport(payload: ReportPayload): Promise<void> {
  if (!supabase) throw new Error("Supabase not initialized");
  const { error } = await supabase.from("reports").insert({
    reporter_id: payload.reporterId,
    type: payload.type,
    reason: payload.reason,
    post_id: payload.postId ?? null,
    comment_id: payload.commentId ?? null,
    reported_user_id: payload.reportedUserId ?? null,
    message_id: payload.messageId ?? null,
  });
  if (error) throw error;
}
