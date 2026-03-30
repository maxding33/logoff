export type Comment = {
  id: string;
  user: string;
  userId: string;
  text: string;
};

export type Post = {
  id: string;
  user: string;
  avatarUrl?: string | null;
  location?: string;
  image: string;
  caption: string;
  createdAt: string;
  liked: boolean;
  likes: number;
  comments: Comment[];
};