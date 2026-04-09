export type Comment = {
  id: string;
  user: string;
  userId: string;
  avatarUrl?: string | null;
  text: string;
};

export type ReactionType = "heart" | "fire" | "muscle";

export const REACTION_EMOJI: Record<ReactionType, string> = {
  heart: "❤️",
  fire: "🔥",
  muscle: "💪",
};

export type ReactionSummary = {
  topTypes: ReactionType[];
  countLabel: string;
  total: number;
};

export function reactionCountLabel(total: number): string {
  if (total < 3)  return "";
  if (total < 5)  return "3+";
  if (total < 10) return "5+";
  if (total < 25) return "10+";
  return "25+";
}

export type Post = {
  id: string;
  user: string;
  userId: string;
  avatarUrl?: string | null;
  location?: string;
  image: string;
  caption: string;
  createdAt: string;
  reactions: ReactionSummary;
  userReaction: ReactionType | null;
  comments: Comment[];
  isChallenge: boolean;
  expiresAt: string | null;
};
