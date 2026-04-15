"use client";

import HomeContent from "../HomeContent";

export default function HomeLayout({
  children,
  messages,
  profile,
  search,
  user,
}: {
  children: React.ReactNode;
  messages: React.ReactNode;
  profile: React.ReactNode;
  search: React.ReactNode;
  user: React.ReactNode;
}) {
  return (
    <>
      <HomeContent />
      {messages}
      {profile}
      {search}
      {user}
    </>
  );
}
