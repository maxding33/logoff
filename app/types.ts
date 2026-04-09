export type Comment = {
  id: string;
  user: string;
  userId: string;
  avatarUrl?: string | null;
  text: string;
};

export type Post = {
  id: string;
  user: string;
  userId: string;
  avatarUrl?: string | null;
  location?: string;
  image: string;
  caption: string;
  createdAt: string;
  liked: boolean;
  likes: number;
  comments: Comment[];
  isChallenge: boolean;
  expiresAt: string | null;
};