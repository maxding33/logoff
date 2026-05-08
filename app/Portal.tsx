"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

/**
 * Renders children into document.body via a React portal.
 * Use this to escape the transformed slider container so that
 * position:fixed overlays reference the viewport, not the 200%-wide slider.
 */
export default function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
