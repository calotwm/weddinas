import type { ReactNode } from "react";
import { checklistSections, type ChecklistTask } from "@/core/couple";
import { formatMonth } from "@/lib/format";

function Section({ title, tone = "text-forest", tasks, renderTask }: { title: string; tone?: string; tasks: ChecklistTask[]; renderTask: (task: ChecklistTask) => ReactNode }) {
  if (tasks.length === 0) return null;
  return (
    <section className="mt-6">
      <h3 className={`label first-letter:uppercase ${tone}`}>{title}</h3>
      <ul className="divide-y divide-forest/8">{tasks.map(renderTask)}</ul>
    </section>
  );
}

/** The checklist's monthly cover: past months' open tasks, this month, next months and tasks without month. */
export function ChecklistBoard({ tasks, month, renderTask }: { tasks: ChecklistTask[]; month: string; renderTask: (task: ChecklistTask) => ReactNode }) {
  const s = checklistSections(tasks, month);
  return (
    <>
      <Section title="Pendientes de meses anteriores" tone="text-rust" tasks={s.overdue} renderTask={renderTask} />
      <Section title={`Este mes · ${formatMonth(month)}`} tasks={s.thisMonth} renderTask={renderTask} />
      {s.upcoming.length > 0 && (
        <section className="mt-6">
          <h3 className="label">Próximos meses</h3>
          {s.upcoming.map((g) => (
            <div key={g.month} className="mt-3">
              <p className="text-sm font-semibold text-teal first-letter:uppercase">{formatMonth(g.month)}</p>
              <ul className="divide-y divide-forest/8">{g.tasks.map(renderTask)}</ul>
            </div>
          ))}
        </section>
      )}
      <Section title="Sin mes" tasks={s.noMonth} renderTask={renderTask} />
      <Section title="Listas de meses anteriores" tone="text-ink/50" tasks={s.pastDone} renderTask={renderTask} />
    </>
  );
}
