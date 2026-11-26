"use client";

import { useRef, useState, useTransition } from "react";

type Focus = { x: number; y: number };

/**
 * Picks which part of the cover photo shows, like choosing a Facebook cover: tap or drag over the photo to mark the
 * faces; the previews show the countdown card and the web's cover cut around that point. Saves when the finger lifts.
 */
export function CoverFocusPicker({
  imageUrl,
  focus,
  save,
  coupleId,
}: {
  imageUrl: string;
  focus?: Focus;
  save: (formData: FormData) => Promise<void>;
  /** For the team's action; the couple's reads it from the session. */
  coupleId?: string;
}) {
  const [point, setPoint] = useState<Focus>(focus ?? { x: 50, y: 50 });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, startTransition] = useTransition();
  const dragging = useRef(false);
  const latest = useRef(point);

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const next = {
      x: Math.round(Math.min(100, Math.max(0, ((e.clientX - box.left) / box.width) * 100))),
      y: Math.round(Math.min(100, Math.max(0, ((e.clientY - box.top) / box.height) * 100))),
    };
    latest.current = next;
    setPoint(next);
  };

  const commit = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const data = new FormData();
    if (coupleId) data.set("coupleId", coupleId);
    data.set("x", String(latest.current.x));
    data.set("y", String(latest.current.y));
    setStatus("saving");
    startTransition(async () => {
      try {
        await save(data);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  };

  const position = `${point.x}% ${point.y}%`;

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/70">Tocá o arrastrá sobre la foto dónde están las caras: eso queda siempre a la vista.</p>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Parte de la foto que se ve"
        aria-valuetext={`${point.x}% desde la izquierda, ${point.y}% desde arriba`}
        aria-valuenow={point.x}
        className="relative cursor-crosshair touch-none overflow-hidden rounded-xl ring-1 ring-forest/20 select-none"
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={(e) => dragging.current && move(e)}
        onPointerUp={commit}
        onPointerCancel={commit}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- the couple's own upload, shown whole to pick a point */}
        <img src={imageUrl} alt="Portada" draggable={false} className="block max-h-96 w-full object-contain" />
        <span
          aria-hidden
          className="pointer-events-none absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.35)]"
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-[3fr_1fr]">
        <figure className="space-y-1">
          <div className="aspect-[3/1] rounded-xl bg-cover ring-1 ring-forest/15" style={{ backgroundImage: `url("${imageUrl}")`, backgroundPosition: position }} />
          <figcaption className="text-xs text-ink/55">Cuenta regresiva del portal</figcaption>
        </figure>
        <figure className="space-y-1">
          <div className="mx-auto aspect-[9/16] max-h-40 rounded-xl bg-cover ring-1 ring-forest/15" style={{ backgroundImage: `url("${imageUrl}")`, backgroundPosition: position }} />
          <figcaption className="text-center text-xs text-ink/55">Web en el celular</figcaption>
        </figure>
      </div>
      <p role="status" aria-live="polite" className={`text-xs ${status === "error" ? "text-rust" : "text-ink/55"}`}>
        {status === "saving" ? "Guardando…" : status === "saved" ? "¡Guardado!" : status === "error" ? "No se pudo guardar. Probá de nuevo." : "Se guarda solo al soltar."}
      </p>
      <p className="hint">Si prefieren armarla en Canva: foto horizontal de 1920 × 1080 px o más, con las caras en el centro.</p>
    </div>
  );
}
