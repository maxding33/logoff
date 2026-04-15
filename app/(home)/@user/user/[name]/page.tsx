"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "../../../../Avatar";
import { supabase } from "../../../../../lib/supabase";
import { followUser, unfollowUser, getFollowStatus, getFriendsCount } from "../../../../../lib/follows";
import { fetchPosts } from "../../../../../lib/posts";
import type { Post } from "../../../../types";
import ReportSheet from "../../../../ReportSheet";
import type { ReportTarget } from "../../../../../lib/reports";
import { blockUser, unblockUser, checkIsBlocked } from "../../../../../lib/blocks";
import SwipeOverlay from "../../../../SwipeOverlay";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [joinDate, setJoinDate] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followedBy, setFollowedBy] = useState(false);
  const [pendingThem, setPendingThem] = useState(false);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [expandedPost, setExpandedPost] = useState<Post | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setCurrentUserId(user.id);

      // Look up target user by username
      const { data: target } = await supabase!
        .from("users")
        .select("id, bio, display_name, created_at, avatar_url")
        .eq("username", name)
        .maybeSingle();

      if (!target) { setLoading(false); return; }
      if (user.id === target.id) { setRedirecting(true); router.replace("/profile"); return; }
      setTargetUserId(target.id);
      setBio(target.bio ?? "");
      setDisplayName((target.display_name as string | null) ?? null);
      setJoinDate(new Date(target.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" }));
      setAvatarUrl((target.avatar_url as string | null) ?? null);

      const [status, friends, countResult] = await Promise.all([
        getFollowStatus(user.id, target.id),
        getFriendsCount(target.id),
        supabase!.from("posts").select("id", { count: "exact", head: true }).eq("user_id", target.id),
      ]);

      setPostsCount(countResult.count ?? 0);

      const isOwnProfile = user.id === target.id;
      const areFriends = status.following && status.followedBy;
      if (isOwnProfile || areFriends) {
        const userPosts = await fetchPosts(user.id, target.id);
        setPosts(userPosts);
      }

      setFollowing(status.following);
      setFollowedBy(status.followedBy);
      setPendingThem(status.pendingThem);
      setFriendsCount(friends);
      checkIsBlocked(user.id, target.id).then(setIsBlocked).catch(() => {});
      setLoading(false);
    });
  }, [name]);

  const handleFollow = async () => {
    if (!currentUserId || !targetUserId) return;
    setFollowLoading(true);
    if (following || pendingThem) {
      await unfollowUser(currentUserId, targetUserId);
      setFollowing(false);
      setPendingThem(false);
      if (following && followedBy) setFriendsCount((c) => c - 1);
    } else {
      await followUser(currentUserId, targetUserId);
      setPendingThem(true);
    }
    setFollowLoading(false);
  };

  const isFriends = following && followedBy;
  const buttonLabel = followLoading ? "..." : isFriends ? "friends \u2713" : pendingThem ? "requested" : "follow";
  const buttonStyle: React.CSSProperties = {
    border: isFriends ? "1px solid #4a7c59" : pendingThem ? "1px solid #ccc" : "none",
    background: isFriends ? "transparent" : pendingThem ? "transparent" : "#000",
    color: isFriends ? "#4a7c59" : pendingThem ? "#666" : "#fff",
    borderRadius: "999px", padding: "8px 20px",
    fontSize: "13px", fontWeight: 700, cursor: "pointer",
    letterSpacing: "0.04em",
  };

  if (redirecting) return null;

  return (
    <SwipeOverlay backTo="/" zIndex={50}>
      {/* Header */}
      <header style={{
        padding: "0 16px", height: "53px",
        borderBottom: "1px solid #e5e5e5",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#000", textDecoration: "none" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {name}
          </span>
        </Link>
        {currentUserId && targetUserId && currentUserId !== targetUserId && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            {showUserMenu && (
              <div style={{ position: "absolute", right: 0, top: "100%", background: "#fff", border: "1px solid #e5e5e5", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 50, minWidth: "160px", overflow: "hidden" }}>
                <button
                  onClick={async () => {
                    setShowUserMenu(false);
                    if (!currentUserId || !targetUserId) return;
                    if (isBlocked) {
                      await unblockUser(currentUserId, targetUserId);
                      setIsBlocked(false);
                    } else {
                      await blockUser(currentUserId, targetUserId);
                      setIsBlocked(true);
                      // Remove follow relationship on block
                      if (following) await unfollowUser(currentUserId, targetUserId).catch(() => {});
                      setFollowing(false);
                    }
                  }}
                  style={{ display: "block", width: "100%", padding: "14px 16px", border: "none", background: "transparent", textAlign: "left", fontSize: "14px", color: isBlocked ? "#4a7c59" : "#e53935", fontWeight: 600, cursor: "pointer" }}
                >
                  {isBlocked ? "Unblock user" : "Block user"}
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); setReportTarget({ type: "user", reportedUserId: targetUserId! }); }}
                  style={{ display: "block", width: "100%", padding: "14px 16px", border: "none", background: "transparent", textAlign: "left", fontSize: "14px", color: "#000", fontWeight: 600, cursor: "pointer", borderTop: "1px solid #f0f0f0" }}
                >
                  Report user
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {!loading && (
        <>
          {/* Profile info */}
          <div style={{ padding: "24px 20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <Avatar name={name} size={80} avatarUrl={avatarUrl} />
            {displayName && <p style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>{displayName}</p>}
            <p style={{ margin: 0, fontSize: displayName ? "13px" : "18px", fontWeight: displayName ? 400 : 700, color: displayName ? "#888" : "#000" }}>@{name}</p>
            {bio && <p style={{ margin: 0, fontSize: "13px", color: "#444", textAlign: "center" }}>{bio}</p>}
            {joinDate && <p style={{ margin: 0, fontSize: "12px", color: "#999" }}>joined {joinDate}</p>}
            {currentUserId !== targetUserId && (
              <button onClick={handleFollow} disabled={followLoading} style={buttonStyle}>
                {buttonLabel}
              </button>
            )}
          </div>

          {/* Stats */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            borderTop: "1px solid #e5e5e5", borderBottom: "1px solid #e5e5e5", margin: "0 0 2px",
          }}>
            {[
              { label: "posts", value: postsCount },
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
          {!isFriends && currentUserId !== targetUserId ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginTop: "48px", color: "#aaa" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p style={{ margin: 0, fontSize: "14px", color: "#aaa" }}>
                {pendingThem ? "waiting for them to accept" : "add as a friend to see their posts"}
              </p>
            </div>
          ) : posts.length === 0 ? (
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
      {reportTarget && currentUserId && (
        <ReportSheet target={reportTarget} currentUserId={currentUserId} onClose={() => setReportTarget(null)} />
      )}
    </SwipeOverlay>
  );
}
