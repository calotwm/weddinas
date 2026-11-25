"use client";

import { useEffect, useRef, useState, useTransition, type FormHTMLAttributes, type ReactNode } from "react";

type Status = "idle" | "dirty" | "saving" | "saved" | "error";

const LABEL: Record<Status, string> = {
  idle: "Los cambios se guardan solos",
  dirty: "Guardando…",
  saving: "Guardando…",
  saved: "¡Guardado!",
  error: "No se pudo guardar. Revisá tu conexión.",
};

/**
 * A form that saves itself a moment after each change, so nobody has to press a button.
 * It calls the action directly instead of submitting, so React does not reset fields the person is still typing in.
 */
export function AutoSaveForm({
  save,
  delay = 900,
  children,
  ...props
}: Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "onChange"> & { save: (data: FormData) => Promise<void>; delay?: number }) {
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [status, setStatus] = useState<Status>("idle");
  const [, startTransition] = useTransition();

  const flush = () => {
    clearTimeout(timer.current);
    if (!form.current) return;
    const data = new FormData(form.current);
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

  const schedule = () => {
    setStatus("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <form
      ref={form}
      {...props}
      onChange={schedule}
      onSubmit={(e) => {
        e.preventDefault();
        flush();
      }}
    >
      {children}
      <p
        role="status"
        className={`sticky bottom-4 z-10 ml-auto w-fit rounded-full px-4 py-2 text-sm shadow-lg ${
          status === "error" ? "bg-rust text-white" : status === "saved" ? "bg-forest text-cream" : "bg-white text-ink/70"
        }`}
      >
        {LABEL[status]}
      </p>
    </form>
  );
}

/**
 * Saves the AutoSaveForm around `element` right away; for changes that fire no input event
 * (a row dragged, a row added or removed).
 */
export function saveEnclosingForm(element: Element | null) {
  element?.closest("form")?.requestSubmit();
}

/**
 * Rows inside an AutoSaveForm that are reordered by dragging their "⠿" handle (or with the arrow keys on it).
 * The new order is the order of the rows' inputs, so the form saves it on its own after each move.
 */
export function SortableRows({ rows, className }: { rows: Array<{ id: string; label: string; content: ReactNode }>; className?: string }) {
  const list = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState(() => rows.map((r) => r.id));
  const [dragging, setDragging] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const moved = useRef(false);

  // Rows added or removed since the first render keep their place in `rows`.
  const ids = rows.map((r) => r.id);
  const shown = [...order.filter((id) => ids.includes(id)), ...ids.filter((id) => !order.includes(id))];
  const byId = new Map(rows.map((r) => [r.id, r]));

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    saveEnclosingForm(list.current);
  }, [order]);

  /** While dragging, rows only move on screen; the form saves once, on drop. */
  const draggedAround = useRef(false);
  const move = (id: string, to: number, save: boolean) => {
    const from = shown.indexOf(id);
    if (from === -1 || to < 0 || to >= shown.length || to === from) return;
    const next = shown.filter((x) => x !== id);
    next.splice(to, 0, id);
    if (save) moved.current = true;
    else draggedAround.current = true;
    setOrder(next);
  };

  return (
    <div ref={list} className={className}>
      {shown.map((id, index) => {
        const row = byId.get(id)!;
        return (
          <div
            key={id}
            draggable={armed === id}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", id);
              setDragging(id);
            }}
            onDragEnd={() => {
              setDragging(null);
              setArmed(null);
              if (draggedAround.current) {
                draggedAround.current = false;
                saveEnclosingForm(list.current);
              }
            }}
            onDragOver={(e) => {
              if (!dragging) return;
              e.preventDefault();
              if (dragging !== id) move(dragging, index, false);
            }}
            onDrop={(e) => e.preventDefault()}
            className={`flex items-start gap-2 ${dragging === id ? "opacity-50" : ""}`}
          >
            <button
              type="button"
              aria-label={`Mover ${row.label} (flechas arriba y abajo)`}
              title="Arrastrar para ordenar"
              onPointerDown={() => setArmed(id)}
              onPointerUp={() => setArmed(null)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                e.preventDefault();
                move(id, index + (e.key === "ArrowUp" ? -1 : 1), true);
              }}
              className="mt-3 cursor-grab touch-none px-1 text-lg leading-none text-ink/35 select-none hover:text-forest active:cursor-grabbing print:hidden"
            >
              ⠿
            </button>
            <div className="min-w-0 flex-1">{row.content}</div>
          </div>
        );
      })}
    </div>
  );
}
