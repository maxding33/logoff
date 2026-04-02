import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { conversationId, senderId, senderUsername, text } = await req.json();
  if (!conversationId || !senderId) return NextResponse.json({ ok: false }, { status: 400 });

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get all members except sender
  const { data: members } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", senderId);

  if (!members?.length) return NextResponse.json({ ok: true });

  const memberIds = members.map((m) => m.user_id);

  // Get their push subscriptions
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("user_id, subscription")
    .in("user_id", memberIds);

  if (!subscriptions?.length) return NextResponse.json({ ok: true });

  const preview = text.length > 60 ? text.slice(0, 60) + "..." : text;

  await Promise.allSettled(
    subscriptions.map((s) =>
      webpush.sendNotification(
        s.subscription as webpush.PushSubscription,
        JSON.stringify({
          title: `@${senderUsername}`,
          body: preview,
        })
      )
    )
  );

  return NextResponse.json({ ok: true });
}
