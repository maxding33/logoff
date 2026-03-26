export type Comment = {
  id: number;
  user: string;
  text: string;
};

export type Post = {
  id: number;
  user: string;
  location: string;
  image: string;
  caption: string;
  createdAt: string;
  liked: boolean;
  likes: number;
  comments: Comment[];
};