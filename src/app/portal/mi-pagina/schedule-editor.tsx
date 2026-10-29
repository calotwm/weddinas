"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
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
          <input name="scheduleTitle" maxLength={120} defaultValue={row.title} aria-label="Momento" placeholder="Ej: Ceremonia" className="field" />
          <button type="button" onClick={() => remove(row.key)} aria-label="Quitar momento" className="btn-icon mt-1.5 shrink-0">
            <Icon name="trash" className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="btn-ghost btn-sm mt-1">
        <Icon name="plus" className="h-3.5 w-3.5" />
        Agregar momento
      </button>
    </div>
  );
}
