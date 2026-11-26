"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { mentionStatus, type MentionStatus } from "@/app/admin/comment-actions";
import { Icon } from "@/components/icons";

const POLL_MS = 30_000;
const STORAGE_KEY = "weddinas-last-mention";

/** A short two-note chime, made in the browser so no sound file is needed. Browsers allow it after a first click. */
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.16;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
    setTimeout(() => void ctx.close(), 1000);
  } catch {
    // No audio available: the badge and the pop-up still show it.
  }
}

const lastAnnounced = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const remember = (id: string) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private mode: it may chime again after a reload.
  }
};

/**
 * The team's mentions bell, like a chat app's: a badge with the unseen mentions, and a chime plus a pop-up when a new
 * one arrives. Checks every 30 seconds.
 */
export function MentionBell() {
  const [status, setStatus] = useState<MentionStatus | null>(null);
  const [toast, setToast] = useState<MentionStatus["latest"]>(null);
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const next = await mentionStatus();
        if (!alive) return;
        setStatus(next);
        const latest = next.latest;
        if (latest && latest.id !== lastAnnounced()) {
          remember(latest.id);
          // On the first check after loading, only mentions that arrived while the panel was closed: no chime.
          if (!first.current) chime();
          setToast(latest);
        }
        first.current = false;
      } catch {
        // Offline or logged out: try again on the next tick.
      }
    };
    void check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [pathname]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(timer);
  }, [toast]);

  const unseen = status?.unseen ?? 0;
  return (
    <>
      <Link href="/admin/menciones" className="btn-light btn-sm relative" aria-label={unseen ? `Menciones, ${unseen} sin ver` : "Menciones"}>
        <Icon name="bell" className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Menciones</span>
        {unseen > 0 && (
          <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-rust px-1 text-[11px] font-semibold text-cream">
            {unseen > 99 ? "99+" : unseen}
          </span>
        )}
      </Link>
      {toast && pathname !== "/admin/menciones" && (
        <div role="status" className="fixed right-4 bottom-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl bg-white p-4 text-left text-ink shadow-xl ring-1 ring-forest/10">
          <div className="flex items-start gap-3">
            <Icon name="chat" className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-forest">{toast.who} te mencionó</p>
              <p className="text-xs text-ink/55">{toast.where}</p>
              <p className="mt-1 line-clamp-3 text-sm">{toast.text}</p>
              <Link href="/admin/menciones" onClick={() => setToast(null)} className="mt-2 inline-block text-sm font-semibold text-teal underline">
                Ver menciones
              </Link>
            </div>
            <button type="button" onClick={() => setToast(null)} className="text-ink/40 hover:text-ink" aria-label="Cerrar">
              <span aria-hidden className="text-lg leading-none">×</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
