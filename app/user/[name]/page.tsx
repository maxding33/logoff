"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Avatar from "../../Avatar";
import { supabase } from "../../../lib/supabase";
import { followUser, unfollowUser, getFollowStatus, getFriendsCount } from "../../../lib/follows";
import { fetchPosts } from "../../../lib/posts";
import type { Post } from "../../types";

export default function UserProfilePage() {
  const params = useParams();
  const name = decodeURIComponent(params.name as string);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followedBy, setFollowedBy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [expandedPost, setExpandedPost] = useState<Post | null>(null);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setCurrentUserId(user.id);

      // Look up target user by username
      const { data: target } = await supabase!
        .from("users")
        .select("id, bio, created_at")
        .eq("username", name)
        .maybeSingle();

      if (!target) { setLoading(false); return; }
      setTargetUserId(target.id);
      setBio(target.bio ?? "");
      setJoinDate(new Date(target.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" }));

      const [userPosts, status, friends] = await Promise.all([
        fetchPosts(user.id, target.id),
        getFollowStatus(user.id, target.id),
        getFriendsCount(target.id),
      ]);

      setPosts(userPosts);
      setFollowing(status.following);
      setFollowedBy(status.followedBy);
      setFriendsCount(friends);
      setLoading(false);
    });
  }, [name]);

  const handleFollow = async () => {
    if (!currentUserId || !targetUserId) return;
    setFollowLoading(true);
    if (following) {
      await unfollowUser(currentUserId, targetUserId);
      setFollowing(false);
      if (followedBy) setFriendsCount((c) => c - 1);
    } else {
      await followUser(currentUserId, targetUserId);
      setFollowing(true);
      if (followedBy) setFriendsCount((c) => c + 1);
    }
    setFollowLoading(false);
  };

  const isFriends = following && followedBy;
  const buttonLabel = followLoading ? "..." : isFriends ? "friends ✓" : following ? "following" : "follow";
  const buttonStyle: React.CSSProperties = {
    border: isFriends ? "1px solid #4a7c59" : following ? "1px solid #ccc" : "none",
    background: isFriends ? "transparent" : following ? "transparent" : "#000",
    color: isFriends ? "#4a7c59" : following ? "#666" : "#fff",
    borderRadius: "999px", padding: "8px 20px",
    fontSize: "13px", fontWeight: 700, cursor: "pointer",
    letterSpacing: "0.04em",
  };

  return (
    <main style={{ minHeight: "100vh", background: "#fff", paddingBottom: "80px" }}>
      {/* Header */}
      <header style={{
        padding: "0 16px", height: "53px",
        borderBottom: "1px solid #e5e5e5",
        display: "flex", alignItems: "center", gap: "12px",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#000", textDecoration: "none" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {name}
          </span>
        </Link>
      </header>

      {!loading && (
        <>
          {/* Profile info */}
          <div style={{ padding: "24px 20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <Avatar name={name} size={80} />
            <p style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>{name}</p>
            {bio && <p style={{ margin: 0, fontSize: "13px", color: "#444", textAlign: "center" }}>{bio}</p>}
            {joinDate && <p style={{ margin: 0, fontSize: "12px", color: "#999" }}>joined {joinDate}</p>}
            <button onClick={handleFollow} disabled={followLoading} style={buttonStyle}>
              {buttonLabel}
            </button>
          </div>

          {/* Stats */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            borderTop: "1px solid #e5e5e5", borderBottom: "1px solid #e5e5e5", margin: "0 0 2px",
          }}>
            {[
              { label: "posts", value: posts.length },
              { label: "friends", value: friendsCount },
              { label: "streak", value: 0 },
              { label: "best", value: 0 },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: "14px 0", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#000" }}>{value}</p>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#999", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Photo grid */}
          {posts.length === 0 ? (
            <p style={{ textAlign: "center", color: "#999", fontSize: "14px", marginTop: "40px" }}>no posts yet</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px" }}>
              {posts.map((post) => (
                <img
                  key={post.id}
                  src={post.image}
                  alt={post.caption || `${name} post`}
                  onClick={() => setExpandedPost(post)}
                  style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block", cursor: "pointer" }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {expandedPost && (
        <div onClick={() => setExpandedPost(null)} style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.85)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "12px", padding: "24px",
        }}>
          <img
            src={expandedPost.image}
            alt={expandedPost.caption}
            style={{ width: "100%", maxWidth: "480px", borderRadius: "4px", objectFit: "contain", maxHeight: "70vh" }}
          />
          {expandedPost.caption && (
            <p style={{ margin: 0, color: "#fff", fontSize: "14px", textAlign: "center", opacity: 0.85 }}>
              {expandedPost.caption}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
