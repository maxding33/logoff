import type { Post } from "../app/types";

let cachedPosts: Post[] = [];
let cachedFreePosts: Post[] = [];
let cachedActiveTab: "challenge" | "free" = "challenge";
let cachedStreak = 0;

export function setHomeCache(posts: Post[], freePosts: Post[], activeTab: "challenge" | "free", streak: number) {
  cachedPosts = posts;
  cachedFreePosts = freePosts;
  cachedActiveTab = activeTab;
  cachedStreak = streak;
}

export function getHomeCache() {
  return { posts: cachedPosts, freePosts: cachedFreePosts, activeTab: cachedActiveTab, streak: cachedStreak };
}
