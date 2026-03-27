"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import BottomNav from "./BottomNav";
import FeedPost from "./FeedPost";
import UploadModal from "./UploadModal";
import type { Comment, Post } from "./types";

const starterPosts: Post[] = [
  {
    id: 1,
    user: "Maya",
    location: "Primrose Hill",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    caption: "Morning air, little walk, head finally clear.",
    createdAt: "2h ago",
    liked: false,
    likes: 18,
    comments: [
      { id: 101, user: "Leo", text: "This looks so peaceful." },
      { id: 102, user: "Nina", text: "Need this kind of morning." },
    ],
  },
  {
    id: 2,
    user: "Jordan",
    location: "Hampstead Heath",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    caption: "Grass touched. Mission complete.",
    createdAt: "4h ago",
    liked: false,
    likes: 27,
    comments: [{ id: 201, user: "Sami", text: "Mission definitely complete." }],
  },
  {
    id: 3,
    user: "Aisha",
    location: "Richmond Park",
    image:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
    caption: "Golden light and an actually offline afternoon.",
    createdAt: "Today",
    liked: false,
    likes: 34,
    comments: [
      { id: 301, user: "Tara", text: "That light is unreal." },
      { id: 302, user: "Milo", text: "Richmond Park never misses." },
    ],
  },
];

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [posts, setPosts] = useState<Post[]>(starterPosts);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  // Load posts from localStorage on first load
  useEffect(() => {
    try {
      const storedPosts = localStorage.getItem("posts");

      if (!storedPosts) {
        return;
      }

      const parsedPosts = JSON.parse(storedPosts) as Post[];

      const normalizedPosts = parsedPosts.map((post) => ({
        ...post,
        liked: post.liked ?? false,
        likes: post.likes ?? 0,
        comments: post.comments ?? [],
      }));

      setPosts(normalizedPosts);
    } catch (error) {
      console.error("Failed to load posts from localStorage", error);
      setPosts(starterPosts);
    }
  }, []);

  // Save posts whenever they change
  useEffect(() => {
    try {
      if (posts.length > 0) {
        localStorage.setItem("posts", JSON.stringify(posts));
      }
    } catch (error) {
      console.error("Failed to save posts to localStorage", error);
    }
  }, [posts]);

  const resetComposer = () => {
    setPreviewImage(null);
    setCaption("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result === "string") {
        setPreviewImage(result);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleSubmitPost = () => {
    if (!previewImage) {
      return;
    }

    const newPost: Post = {
      id: Date.now(),
      user: "You",
      location: "Outside",
      image: previewImage,
      caption: caption.trim() || "Went outside today.",
      createdAt: "Just now",
      liked: false,
      likes: 0,
      comments: [],
    };

    setPosts((currentPosts) => [newPost, ...currentPosts]);
    resetComposer();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleLike = (postId: number) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        const nextLiked = !post.liked;

        return {
          ...post,
          liked: nextLiked,
          likes: nextLiked ? post.likes + 1 : Math.max(post.likes - 1, 0),
        };
      })
    );
  };

  const handleAddComment = (postId: number, text: string) => {
    const newComment: Comment = {
      id: Date.now(),
      user: "You",
      text,
    };

    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        return {
          ...post,
          comments: [...post.comments, newComment],
        };
      })
    );
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        padding: "0 0 80px",
      }}
    >
      <header style={{
        padding: "16px",
        borderBottom: "1px solid #e5e5e5",
        textAlign: "center",
      }}>
        <p style={{
          margin: 0,
          fontSize: "13px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#000000",
        }}>
          touchgrass
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gap: 0,
        }}
      >
        {posts.map((post) => (
          <FeedPost
            key={post.id}
            post={post}
            onToggleLike={handleToggleLike}
            onAddComment={handleAddComment}
          />
        ))}
      </section>

      <UploadModal
        preview={previewImage}
        caption={caption}
        onCaptionChange={setCaption}
        onClose={resetComposer}
        onSubmit={handleSubmitPost}
      />

      <BottomNav
        fileInputRef={fileInputRef}
        handlePhotoChange={handlePhotoChange}
      />
    </main>
  );
}