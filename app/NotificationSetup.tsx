"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { registerAndSubscribe } from "../lib/notifications";
import { isCapacitor, requestNativePermission, checkNativePermission, scheduleDailyChallenge } from "../lib/capacitor-notifications";

export default function NotificationSetup() {
  const [show, setShow] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);

      if (isCapacitor()) {
        // Native Capacitor path
        const perm = await checkNativePermission();
        if (perm === "granted") {
          // Already granted — reschedule daily notification
          scheduleDailyChallenge();
          return;
        }
        if (perm === "denied") return;
        // Permission not yet requested — show prompt
        if (!localStorage.getItem("push_subscribed")) {
          setTimeout(() => setShow(true), 3000);
        }
      } else {
        // Web/PWA path
        if (!("Notification" in window)) return;
        if (Notification.permission === "granted") return;
        if (Notification.permission === "denied") return;
        if (localStorage.getItem("push_subscribed")) return;
        setTimeout(() => setShow(true), 3000);
      }
    });
  }, []);

  const handleAllow = async () => {
    if (!userId) return;
    setShow(false);

    if (isCapacitor()) {
      const granted = await requestNativePermission();
      if (granted) {
        localStorage.setItem("push_subscribed", "1");
        await scheduleDailyChallenge();
        setDone(true);
        setTimeout(() => setDone(false), 3000);
      } else {
        setDenied(true);
        setTimeout(() => setDenied(false), 5000);
      }
    } else {
      const ok = await registerAndSubscribe(userId);
      if (ok) {
        localStorage.setItem("push_subscribed", "1");
        setDone(true);
        setTimeout(() => setDone(false), 3000);
      }
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("push_subscribed", "dismissed");
  };

  if (denied) {
    return (
      <div style={{
        position: "fixed", bottom: "96px", left: "16px", right: "16px",
        background: "#fff", border: "1px solid #e5e5e5",
        borderRadius: "16px", padding: "18px",
        zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      }}>
        <p style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700 }}>
          notifications blocked
        </p>
        <p style={{ margin: 0, fontSize: "13px", color: "#666", lineHeight: 1.5 }}>
          go to Settings → LOGOFF → Notifications and turn them on.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{
        position: "fixed", bottom: "96px", left: "50%", transform: "translateX(-50%)",
        background: "#4a7c59", color: "#fff", borderRadius: "999px",
        padding: "10px 20px", fontSize: "13px", fontWeight: 600,
        zIndex: 100, whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      }}>
        ✓ notifications on
      </div>
    );
  }

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", bottom: "96px", left: "16px", right: "16px",
      background: "#fff", border: "1px solid #e5e5e5",
      borderRadius: "16px", padding: "18px",
      zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
    }}>
      <p style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700 }}>
        turn on notifications
      </p>
      <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#666", lineHeight: 1.5 }}>
        once a day, at a random time, we&apos;ll ping you to go outside. you&apos;ll have 1 hour to post a photo.
      </p>
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={handleAllow}
          style={{
            flex: 1, background: "#000", color: "#fff", border: "none",
            borderRadius: "999px", padding: "12px", fontSize: "14px",
            fontWeight: 700, cursor: "pointer",
          }}
        >
          allow
        </button>
        <button
          onClick={handleDismiss}
          style={{
            flex: 1, background: "transparent", color: "#999", border: "1px solid #e5e5e5",
            borderRadius: "999px", padding: "12px", fontSize: "14px",
            fontWeight: 600, cursor: "pointer",
          }}
        >
          not now
        </button>
      </div>
    </div>
  );
}
