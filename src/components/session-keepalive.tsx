"use client";

import { useEffect, useRef } from "react";
import { keepAdminSessionAlive } from "@/app/actions";
import { keepAliveDue } from "@/core/session-keepalive";

/** Renews the team session while someone is using the panel (clicks, typing, coming back to the tab). */
export function SessionKeepAlive() {
  const last = useRef(0);

  useEffect(() => {
    last.current = Date.now();
    const ping = () => {
      const now = Date.now();
      if (!keepAliveDue(last.current, now)) return;
      last.current = now;
      keepAdminSessionAlive().catch(() => {
        last.current = 0;
      });
    };
    const onVisible = () => document.visibilityState === "visible" && ping();
    const events = ["pointerdown", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, ping, { passive: true }));
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      events.forEach((e) => window.removeEventListener(e, ping));
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
