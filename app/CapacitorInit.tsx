"use client";

import { useEffect } from "react";

export default function CapacitorInit() {
  useEffect(() => {
    import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
      StatusBar.setOverlaysWebView({ overlay: true });
      StatusBar.setStyle({ style: Style.Light });
    }).catch(() => {
      // Not running in Capacitor — ignore
    });
  }, []);

  return null;
}
