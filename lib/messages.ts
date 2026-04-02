import { supabase } from "./supabase";

function getClient() {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

export type ConversationMember = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  lastSeen: string | null;
  lastReadAt: string;
};

export type Conversation = {
  id: string;
  isGroup: boolean;
  name: string | null;
  members: ConversationMember[];
  lastMessage: { text: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderAvatarUrl: string | null;
  text: string;
  createdAt: string;
};

export function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
}

export async function getConversations(userId: string): Promise<Conversation[]> {
  const db = getClient();

  const { data: memberships, error: e1 } = await db
    .from("conversation_members")
    .select("conversation_id, last_read_at, conversations(id, is_group, name, created_at)")
    .eq("user_id", userId);
  if (e1) throw e1;
  if (!memberships?.length) return [];

  const convIds = memberships.map((m: any) => m.conversation_id);

  const [{ data: allMembers, error: e2 }, { data: recentMessages, error: e3 }] = await Promise.all([
    db.from("conversation_members")
      .select("conversation_id, user_id, last_read_at, users(username, avatar_url, last_seen)")
      .in("conversation_id", convIds),
    db.from("messages")
      .select("id, conversation_id, sender_id, text, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  if (e2) throw e2;
  if (e3) throw e3;

  return memberships.map((membership: any) => {
    const conv = membership.conversations;
    const myLastRead = new Date(membership.last_read_at);

    const members: ConversationMember[] = (allMembers || [])
      .filter((m: any) => m.conversation_id === membership.conversation_id && m.user_id !== userId)
      .map((m: any) => ({
        userId: m.user_id,
        username: m.users?.username ?? "unknown",
        avatarUrl: m.users?.avatar_url ?? null,
        lastSeen: m.users?.last_seen ?? null,
        lastReadAt: m.last_read_at,
      }));

    const convMessages = (recentMessages || []).filter((m: any) => m.conversation_id === membership.conversation_id);
    const lastMsg = convMessages[0] ?? null;
    const unreadCount = convMessages.filter(
      (m: any) => m.sender_id !== userId && new Date(m.created_at) > myLastRead
    ).length;

    return {
      id: conv.id,
      isGroup: conv.is_group,
      name: conv.name ?? null,
      members,
      lastMessage: lastMsg ? { text: lastMsg.text, senderId: lastMsg.sender_id, createdAt: lastMsg.created_at } : null,
      unreadCount,
      updatedAt: lastMsg?.created_at ?? conv.created_at,
    };
  }).sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getOrCreateDM(userId: string, otherUserId: string): Promise<string> {
  const db = getClient();
  const { data, error } = await db.rpc("create_dm_conversation", { other_user_id: otherUserId });
  if (error) throw error;
  return data as string;
}

export async function createGroupChat(userId: string, memberIds: string[], name: string): Promise<string> {
  const db = getClient();
  const others = memberIds.filter((id) => id !== userId);
  const { data, error } = await db.rpc("create_group_conversation", { member_ids: others, group_name: name });
  if (error) throw error;
  return data as string;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const db = getClient();
  const { data, error } = await db
    .from("messages")
    .select("id, conversation_id, sender_id, text, created_at, users(username, avatar_url)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data || []).map((m: any) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    senderUsername: m.users?.username ?? "unknown",
    senderAvatarUrl: m.users?.avatar_url ?? null,
    text: m.text,
    createdAt: m.created_at,
  }));
}

export async function sendMessage(conversationId: string, senderId: string, text: string): Promise<Message> {
  const db = getClient();
  const { data, error } = await db
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, text })
    .select("id, conversation_id, sender_id, text, created_at, users(username, avatar_url)")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderId: data.sender_id,
    senderUsername: (data.users as any)?.username ?? "unknown",
    senderAvatarUrl: (data.users as any)?.avatar_url ?? null,
    text: data.text,
    createdAt: data.created_at,
  };
}

export async function markAsRead(conversationId: string, userId: string): Promise<void> {
  const db = getClient();
  await db.from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

export async function getConversationMembers(conversationId: string): Promise<ConversationMember[]> {
  const db = getClient();
  const { data, error } = await db
    .from("conversation_members")
    .select("user_id, last_read_at, users(username, avatar_url, last_seen)")
    .eq("conversation_id", conversationId);
  if (error) throw error;
  return (data || []).map((m: any) => ({
    userId: m.user_id,
    username: m.users?.username ?? "unknown",
    avatarUrl: m.users?.avatar_url ?? null,
    lastSeen: m.users?.last_seen ?? null,
    lastReadAt: m.last_read_at,
  }));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const db = getClient();
  const { data: memberships, error: e1 } = await db
    .from("conversation_members").select("conversation_id, last_read_at").eq("user_id", userId);
  if (e1 || !memberships?.length) return 0;

  const convIds = memberships.map((m: any) => m.conversation_id);
  const { data: messages, error: e2 } = await db
    .from("messages").select("conversation_id, sender_id, created_at")
    .in("conversation_id", convIds).neq("sender_id", userId);
  if (e2 || !messages) return 0;

  // Count conversations with at least one unread message (not total messages)
  let count = 0;
  for (const m of memberships) {
    const lastRead = new Date(m.last_read_at);
    const hasUnread = messages.some(
      (msg: any) => msg.conversation_id === m.conversation_id && new Date(msg.created_at) > lastRead
    );
    if (hasUnread) count++;
  }
  return count;
}

export async function updateLastSeen(userId: string): Promise<void> {
  const db = getClient();
  await db.from("users").update({ last_seen: new Date().toISOString() }).eq("id", userId);
}
