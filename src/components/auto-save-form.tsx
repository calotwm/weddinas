"use client";

import { useEffect, useRef, useState, useTransition, type FormHTMLAttributes } from "react";

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
