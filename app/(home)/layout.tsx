"use client";

import HomeContent from "../HomeContent";

export default function HomeLayout({
  children,
  messages,
}: {
  children: React.ReactNode;
  messages: React.ReactNode;
}) {
  return (
    <>
      <HomeContent />
      {messages}
    </>
  );
}
