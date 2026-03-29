"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setChecked(true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && pathname !== "/auth") {
        router.replace("/auth");
        // Dismiss splash for unauthenticated users going to /auth
        (window as any).__dismissSplash?.();
      } else {
        setChecked(true);
        // Authenticated users: let the page dismiss the splash once data is ready
        // (but safety fallback after 4s in case something goes wrong)
        setTimeout(() => (window as any).__dismissSplash?.(), 4000);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && pathname !== "/auth") {
        router.replace("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  if (!checked && pathname !== "/auth") {
    return null;
  }

  return <>{children}</>;
}
