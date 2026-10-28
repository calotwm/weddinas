"use client";

import { useState } from "react";
import type { ScheduleItem } from "@/core/couple";

export function ScheduleEditor({ initial }: { initial: ScheduleItem[] }) {
  const [rows, setRows] = useState<Array<ScheduleItem & { key: number }>>(() =>
    (initial.length ? initial : [{ time: "", title: "" }]).map((item, key) => ({ ...item, key })),
  );

  const add = () => setRows((r) => [...r, { time: "", title: "", key: Date.now() }]);
  const remove = (key: number) => setRows((r) => r.filter((row) => row.key !== key));

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.key} className="flex gap-2">
          <input name="scheduleTime" type="time" defaultValue={row.time} aria-label="Hora" className="field w-32 shrink-0" />
          <input name="scheduleTitle" defaultValue={row.title} aria-label="Momento" placeholder="Ej: Ceremonia" className="field" />
          <button type="button" onClick={() => remove(row.key)} aria-label="Quitar" className="px-2 text-ink/40 hover:text-rust">✕</button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-sm text-teal underline underline-offset-4">+ Agregar momento</button>
    </div>
  );
}
