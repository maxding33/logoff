"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  updateProfile,
  updateNotificationPrefs,
  completeOnboarding,
  type NotificationPrefs,
} from "../../lib/profile";
import { registerAndSubscribe } from "../../lib/notifications";
import Avatar from "../Avatar";

type Step = "profile" | "notifications" | "friends" | "challenge";

const STEPS: Step[] = ["profile", "notifications", "friends", "challenge"];

function ProgressDots({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current);
  return (
    <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
      {STEPS.map((_, i) => (
        <div
          key={i}
          style={{
            width: i === idx ? "20px" : "6px",
            height: "6px",
            borderRadius: "3px",
            background: i <= idx ? "#000" : "#e5e5e5",
            transition: "width 0.25s ease, background 0.25s ease",
          }}
        />
      ))}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        width: "44px",
        height: "26px",
        borderRadius: "13px",
        background: on ? "#000" : "#e5e5e5",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s ease",
        flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute",
        top: "3px",
        left: on ? "21px" : "3px",
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        background: "#fff",
        transition: "left 0.2s ease",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("profile");
  const [saving, setSaving] = useState(false);

  // Profile step
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Notifications step
  const [prefs, setPrefs] = useState<NotificationPrefs>({ challenge: true, social: true, dms: true });
  const [notifStatus, setNotifStatus] = useState<"idle" | "enabling" | "granted" | "denied">("idle");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/auth"); return; }
      setUserId(user.id);
    });
  }, [router]);

  useEffect(() => {
    if (step === "profile") usernameInputRef.current?.focus();
  }, [step]);

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  // Step 1: save profile
  const saveProfile = async () => {
    if (!userId || !username.trim()) return;
    setSaving(true);
    try {
      await updateProfile(userId, { username: username.trim(), bio: bio.trim() });
      goNext();
    } finally {
      setSaving(false);
    }
  };

  // Step 2: save notification prefs + optionally request push permission
  const saveNotifications = async (requestPermission: boolean) => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateNotificationPrefs(userId, prefs);
      if (requestPermission) {
        setNotifStatus("enabling");
        const ok = await registerAndSubscribe(userId);
        setNotifStatus(ok ? "granted" : "denied");
        if (ok) localStorage.setItem("push_subscribed", "1");
      }
      goNext();
    } finally {
      setSaving(false);
    }
  };

  // Step 4: complete onboarding
  const finish = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await completeOnboarding(userId);
      router.replace("/");
    } finally {
      setSaving(false);
    }
  };

  const shareInvite = async () => {
    const url = typeof window !== "undefined" ? window.location.origin : "";
    if (navigator.share) {
      await navigator.share({ title: "Join me on LOGOFF", url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fff",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        @keyframes stepIn {
          from { opacity: 0; transform: translateX(18px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Top bar */}
      <div style={{
        padding: "16px 20px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}>
        <p style={{ margin: 0, fontSize: "13px", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          LOGOFF
        </p>
        <ProgressDots current={step} />
      </div>

      {/* Step content */}
      <div
        key={step}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "24px 24px 40px",
          animation: "stepIn 0.25s ease",
        }}
      >
        {step === "profile" && (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: "32px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Avatar name={username || "?"} size={72} />
              </div>
              <h1 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.01em" }}>
                Set up your profile
              </h1>
              <p style={{ margin: "0 0 28px", fontSize: "14px", color: "#888", lineHeight: 1.5 }}>
                What should your friends call you?
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "#999", textTransform: "uppercase", marginBottom: "6px" }}>
                    Username
                  </label>
                  <input
                    ref={usernameInputRef}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && username.trim()) saveProfile(); }}
                    placeholder="your name"
                    maxLength={30}
                    style={{
                      width: "100%",
                      fontSize: "17px",
                      fontWeight: 600,
                      border: "none",
                      borderBottom: "2px solid #000",
                      outline: "none",
                      padding: "6px 0",
                      background: "transparent",
                      color: "#000",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "#999", textTransform: "uppercase", marginBottom: "6px" }}>
                    Bio <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
                  </label>
                  <input
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="a little about you"
                    maxLength={120}
                    style={{
                      width: "100%",
                      fontSize: "15px",
                      border: "none",
                      borderBottom: "1px solid #e5e5e5",
                      outline: "none",
                      padding: "6px 0",
                      background: "transparent",
                      color: "#000",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={!username.trim() || saving}
              style={{
                width: "100%",
                padding: "16px",
                background: username.trim() ? "#000" : "#e5e5e5",
                color: username.trim() ? "#fff" : "#aaa",
                border: "none",
                borderRadius: "14px",
                fontSize: "15px",
                fontWeight: 700,
                cursor: username.trim() ? "pointer" : "default",
                transition: "background 0.2s ease",
                letterSpacing: "0.04em",
              }}
            >
              {saving ? "saving..." : "continue"}
            </button>
          </>
        )}

        {step === "notifications" && (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>🔔</div>
              <h1 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.01em" }}>
                Notifications
              </h1>
              <p style={{ margin: "0 0 32px", fontSize: "14px", color: "#888", lineHeight: 1.5 }}>
                Choose what you want to hear about. You can change this anytime in settings.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {([
                  { key: "challenge" as const, label: "Daily challenge", desc: "Reminder when it's time to go outside" },
                  { key: "social" as const, label: "Likes & comments", desc: "When someone reacts to your posts" },
                  { key: "dms" as const, label: "Direct messages", desc: "When a friend messages you" },
                ] as const).map(({ key, label, desc }, i, arr) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 0",
                      borderBottom: i < arr.length - 1 ? "1px solid #f0f0f0" : "none",
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#000" }}>{label}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#aaa" }}>{desc}</p>
                    </div>
                    <Toggle on={prefs[key]} onChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                onClick={() => saveNotifications(true)}
                disabled={saving || notifStatus === "enabling"}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: "#000",
                  color: "#fff",
                  border: "none",
                  borderRadius: "14px",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                {saving || notifStatus === "enabling" ? "enabling..." : "enable notifications"}
              </button>
              <button
                onClick={() => saveNotifications(false)}
                disabled={saving}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "transparent",
                  color: "#999",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                not now
              </button>
            </div>
          </>
        )}

        {step === "friends" && (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>👋</div>
              <h1 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.01em" }}>
                Bring a friend
              </h1>
              <p style={{ margin: "0 0 32px", fontSize: "14px", color: "#888", lineHeight: 1.5 }}>
                LOGOFF is better with people you know. Share the link and get them to sign up.
              </p>

              <button
                onClick={shareInvite}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "16px 18px",
                  background: "#f7f7f7",
                  border: "none",
                  borderRadius: "14px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <div>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#000" }}>Share invite link</p>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#aaa" }}>Send them the link to sign up</p>
                </div>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                onClick={goNext}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: "#000",
                  color: "#fff",
                  border: "none",
                  borderRadius: "14px",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                done
              </button>
              <button
                onClick={goNext}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "transparent",
                  color: "#999",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                skip for now
              </button>
            </div>
          </>
        )}

        {step === "challenge" && (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>🌿</div>
              <h1 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.01em" }}>
                The daily challenge
              </h1>
              <p style={{ margin: "0 0 28px", fontSize: "14px", color: "#888", lineHeight: 1.5 }}>
                Every day, there&apos;s a 3-hour window to log off your phone and go outside. Take a photo — that&apos;s your post.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {[
                  { icon: "⏰", title: "A window opens", body: "You'll get a notification when it's time." },
                  { icon: "📸", title: "Go outside, take a photo", body: "Anywhere works. The park, your street, a rooftop." },
                  { icon: "🤝", title: "See what your friends did", body: "Everyone posts during the same window." },
                ].map(({ icon, title, body }) => (
                  <div key={title} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "22px", flexShrink: 0, marginTop: "1px" }}>{icon}</span>
                    <div>
                      <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#000" }}>{title}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#888", lineHeight: 1.5 }}>{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={finish}
              disabled={saving}
              style={{
                width: "100%",
                padding: "16px",
                background: "#000",
                color: "#fff",
                border: "none",
                borderRadius: "14px",
                fontSize: "15px",
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.04em",
              }}
            >
              {saving ? "..." : "let's go"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
