"use client";

import { useState } from "react";
import type { CalendarPost } from "../lib/posts";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function toLocalDateStr(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

type DayViewProps = {
  dateStr: string;
  posts: CalendarPost[];
  onClose: () => void;
};

function DayView({ dateStr, posts, onClose }: DayViewProps) {
  const [index, setIndex] = useState(0);
  const post = posts[index];
  const date = new Date(dateStr + "T12:00:00");
  const label = date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 600,
      background: "#000",
      display: "flex", flexDirection: "column",
      animation: "calDaySlideUp 0.22s ease",
    }}>
      <style>{`
        @keyframes calDaySlideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: "53px", flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "44px", minHeight: "44px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#fff" }}>{label}</p>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: "44px", justifyContent: "flex-end" }}>
          {posts.length > 1 && posts.map((_, i) => (
            <div key={i} style={{ width: i === index ? "14px" : "5px", height: "5px", borderRadius: "3px", background: i === index ? "#fff" : "rgba(255,255,255,0.3)", transition: "width 0.2s ease" }} />
          ))}
        </div>
      </div>

      {/* Image */}
      <div
        style={{ flex: 1, position: "relative", overflow: "hidden" }}
        onClick={() => setIndex((i) => (i + 1) % posts.length)}
      >
        <img
          src={post.imageUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {post.isChallenge && (
          <div style={{
            position: "absolute", top: "16px", right: "16px",
            background: "rgba(74,124,89,0.9)", color: "#fff",
            fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em",
            padding: "4px 10px", borderRadius: "999px",
          }}>
            challenge
          </div>
        )}
      </div>

      {/* Caption */}
      {post.caption && post.caption.trim() && (
        <div style={{ padding: "16px 20px calc(20px + env(safe-area-inset-bottom))", background: "#000", flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: "14px", color: "#eee", lineHeight: 1.4 }}>{post.caption}</p>
        </div>
      )}
    </div>
  );
}

type Props = {
  posts: CalendarPost[];
  onClose: () => void;
};

export default function ProfileCalendar({ posts, onClose }: Props) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Group posts by local date string
  const postsByDate = posts.reduce<Record<string, CalendarPost[]>>((acc, p) => {
    const key = toLocalDateStr(p.createdAt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const days = getCalendarDays(year, month);
  const todayStr = toLocalDateStr(today.toISOString());

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const isNextDisabled = year > today.getFullYear() || (year === today.getFullYear() && month >= today.getMonth());

  if (selectedDate) {
    const dayPosts = postsByDate[selectedDate] ?? [];
    return <DayView dateStr={selectedDate} posts={dayPosts} onClose={() => setSelectedDate(null)} />;
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "#fff",
      display: "flex", flexDirection: "column",
      animation: "calSlideUp 0.28s cubic-bezier(0.32,0.72,0,1)",
    }}>
      <style>{`
        @keyframes calSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", height: "53px", borderBottom: "1px solid #e5e5e5", flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "44px", minHeight: "44px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "36px", minHeight: "36px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, minWidth: "140px", textAlign: "center" }}>
            {MONTHS[month]} {year}
          </p>
          <button onClick={nextMonth} disabled={isNextDisabled} style={{ background: "none", border: "none", cursor: isNextDisabled ? "default" : "pointer", color: isNextDisabled ? "#ccc" : "#000", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "36px", minHeight: "36px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div style={{ minWidth: "44px" }} />
      </div>

      {/* Weekday labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "10px 8px 4px", flexShrink: 0 }}>
        {WEEKDAYS.map((d) => (
          <p key={d} style={{ margin: 0, textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#bbb", letterSpacing: "0.04em" }}>{d}</p>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px", padding: "0 8px", flex: 1, alignContent: "start" }}>
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayPosts = postsByDate[dateStr] ?? [];
          const challengePost = dayPosts.find((p) => p.isChallenge);
          const hasAnyPost = dayPosts.length > 0;
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;

          return (
            <button
              key={day}
              onClick={() => hasAnyPost ? setSelectedDate(dateStr) : undefined}
              style={{
                aspectRatio: "1",
                borderRadius: "10px",
                overflow: "hidden",
                position: "relative",
                background: challengePost ? "transparent" : "#f7f7f7",
                border: isToday ? "2px solid #4a7c59" : "2px solid transparent",
                cursor: hasAnyPost ? "pointer" : "default",
                padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: isFuture ? 0.3 : 1,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {challengePost ? (
                <>
                  <img src={challengePost.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.18)" }} />
                  <span style={{ position: "relative", fontSize: "11px", fontWeight: 800, color: "#fff" }}>{day}</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: "12px", fontWeight: hasAnyPost ? 700 : 500, color: hasAnyPost ? "#000" : "#ccc" }}>{day}</span>
                  {hasAnyPost && (
                    <div style={{ position: "absolute", bottom: "4px", left: "50%", transform: "translateX(-50%)", width: "4px", height: "4px", borderRadius: "50%", background: "#4a7c59" }} />
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", justifyContent: "center", padding: "12px 0 calc(12px + env(safe-area-inset-bottom))", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#888" }} />
          <span style={{ fontSize: "11px", color: "#aaa" }}>challenge</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#4a7c59" }} />
          <span style={{ fontSize: "11px", color: "#aaa" }}>log</span>
        </div>
      </div>
    </div>
  );
}
