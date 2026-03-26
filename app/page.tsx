"use client";

import { ChangeEvent, useRef, useState } from "react";
import BottomNav from "./BottomNav";
import FeedPost from "./FeedPost";
import UploadModal from "./UploadModal";
import { Post } from "./types";

const starterPosts: Post[] = [
  {
    id: 1,
    user: "Maya",
    location: "Primrose Hill",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    caption: "Morning air, little walk, head finally clear.",
    createdAt: "2h ago",
  },
  {
    id: 2,
    user: "Jordan",
    location: "Hampstead Heath",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    caption: "Grass touched. Mission complete.",
    createdAt: "4h ago",
  },
  {
    id: 3,
    user: "Aisha",
    location: "Richmond Park",
    image:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
    caption: "Golden light and an actually offline afternoon.",
    createdAt: "Today",
  },
];

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [posts, setPosts] = useState<Post[]>(starterPosts);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

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
    };

    setPosts((currentPosts) => [newPost, ...currentPosts]);
    resetComposer();
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 45%, #e2e8f0 100%)",
        padding: "24px 16px 110px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: "20px",
            padding: "4px 4px 10px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#16a34a",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontSize: "12px",
            }}
          >
            go touch grass
          </p>
          <h1
            style={{
              margin: "8px 0 0",
              color: "#0f172a",
              fontSize: "32px",
              lineHeight: 1.05,
            }}
          >
            Photo feed
          </h1>
          <p
            style={{
              margin: "10px 0 0",
              color: "#475569",
              fontSize: "15px",
              lineHeight: 1.5,
            }}
          >
            An Instagram-style outdoor feed. Tap the green plus button to post a photo with a caption.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gap: "18px",
          }}
        >
          {posts.map((post) => (
            <FeedPost key={post.id} post={post} />
          ))}
        </section>
      </div>

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