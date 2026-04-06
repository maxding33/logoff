"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import { checkOnboardingCompleted } from "../lib/profile";

const PUBLIC_PATHS = ["/auth", "/onboarding"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setChecked(true);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        if (!PUBLIC_PATHS.includes(pathname)) {
          router.replace("/auth");
          (window as any).__dismissSplash?.();
        } else {
          setChecked(true);
        }
        return;
      }
      // Logged in — check onboarding only when not already on a public path
      if (!PUBLIC_PATHS.includes(pathname)) {
        const done = await checkOnboardingCompleted(session.user.id);
        if (!done) {
          router.replace("/onboarding");
          (window as any).__dismissSplash?.();
          return;
        }
      }
      setChecked(true);
      // Safety fallback to dismiss splash after 4s in case page doesn't do it
      setTimeout(() => (window as any).__dismissSplash?.(), 4000);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !PUBLIC_PATHS.includes(pathname)) {
        router.replace("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  if (!checked && !PUBLIC_PATHS.includes(pathname)) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff",
      }}>
        <style>{`
          @keyframes logoFadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes subtitleFadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <p style={{
          margin: 0,
          fontSize: "22px",
          fontWeight: 900,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#000",
          animation: "logoFadeIn 0.4s ease forwards",
        }}>
          LOGOFF
        </p>
        <p style={{
          margin: "6px 0 0",
          fontSize: "13px",
          fontWeight: 500,
          letterSpacing: "0.08em",
          color: "#999",
          opacity: 0,
          animation: "subtitleFadeIn 0.4s ease 0.6s forwards",
        }}>
          go outside
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
