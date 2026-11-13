import Image from "next/image";
import { Icon } from "@/components/icons";
import { ChecklistBoard } from "@/components/planner/checklist";
import { publishedTasks, type ChecklistTask } from "@/core/couple";
import { currentMonth, formatMonth } from "@/lib/format";
import { getCurrentCouple } from "../data";
import cover from "../../../../public/img/month-topics-cover.jpg";

/** Read-only: only the team ticks topics. */
function TaskRow({ task, month }: { task: ChecklistTask; month: string }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span
        role="img"
        aria-label={task.done ? "Listo" : "Pendiente"}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
          task.done ? "border-teal bg-teal text-white" : "border-forest/25 text-transparent"
        }`}
      >
        <Icon name="check" className="h-4 w-4" />
      </span>
      <span className={`flex-1 ${task.done ? "text-ink/40 line-through" : ""}`}>{task.title}</span>
      {task.month && task.month < month && <span className="chip bg-peach py-0.5 text-rust normal-case tracking-normal">{formatMonth(task.month)}</span>}
    </li>
  );
}

export default async function ChecklistPage() {
  // The team's unpublished draft topics stay hidden from the couple.
  const tasks = publishedTasks((await getCurrentCouple()).tasks);
  const month = currentMonth();
  const done = tasks.filter((t) => t.done);
  const progress = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;

  return (
    <div className="card mx-auto max-w-2xl">
      {/* Agency cover; the title text sits in the middle third, so a 3:1 center crop keeps it. */}
      <Image src={cover} alt="Casamiento, temas del mes" priority sizes="(min-width: 768px) 42rem, 100vw" className="mb-6 aspect-[3/1] w-full rounded-2xl object-cover" />
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="section-title">Temas del mes</h2>
          <p className="text-sm text-ink/60">{done.length} de {tasks.length} tareas listas</p>
        </div>
        <p className="font-display text-4xl text-teal">{progress}%</p>
      </div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-sand">
        <div className="h-full rounded-full bg-gradient-to-r from-mint to-teal" style={{ width: `${progress}%` }} />
      </div>


      {tasks.length === 0 && <p className="py-8 text-center text-ink/50">Todavía no les cargamos temas. Cuando los sumemos, los van a ver acá.</p>}

      <ChecklistBoard tasks={tasks} month={month} renderTask={(t) => <TaskRow key={t.id} task={t} month={month} />} />
    </div>
  );
}
