import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { ChecklistBoard } from "@/components/planner/checklist";
import { SubmitButton } from "@/components/submit-button";
import type { ChecklistTask } from "@/core/couple";
import { currentMonth } from "@/lib/format";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";
import { addChecklistTask, deleteChecklistTask, setChecklistTaskMonth, toggleChecklistTask } from "@/app/admin/planner-actions";

export const dynamic = "force-dynamic";

function TaskRow({ coupleId, task }: { coupleId: string; task: ChecklistTask }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <form action={toggleChecklistTask}>
        <input type="hidden" name="coupleId" value={coupleId} />
        <input type="hidden" name="taskId" value={task.id} />
        <button
          aria-label={task.done ? `Marcar "${task.title}" como pendiente` : `Marcar "${task.title}" como lista`}
          className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 transition-colors ${
            task.done ? "border-teal bg-teal text-white" : "border-forest/25 text-transparent hover:border-teal hover:text-teal/50"
          }`}
        >
          <Icon name="check" className="h-4 w-4" />
        </button>
      </form>
      <span className={`min-w-40 flex-1 ${task.done ? "text-ink/40 line-through" : ""}`}>{task.title}</span>
      <form action={setChecklistTaskMonth} className="flex items-center gap-1">
        <input type="hidden" name="coupleId" value={coupleId} />
        <input type="hidden" name="taskId" value={task.id} />
        <input name="month" type="month" defaultValue={task.month ?? ""} aria-label={`Mes de ${task.title}`} className="field !w-40 !py-1.5 text-sm" />
        <SubmitButton className="btn-ghost btn-sm" pendingText="…">Cambiar mes</SubmitButton>
      </form>
      <form action={deleteChecklistTask}>
        <input type="hidden" name="coupleId" value={coupleId} />
        <input type="hidden" name="taskId" value={task.id} />
        <SubmitButton className="btn-icon" pendingText="…" confirm={`¿Borrar "${task.title}"?`}>
          <Icon name="trash" className="h-4 w-4" />
          <span className="sr-only">Borrar {task.title}</span>
        </SubmitButton>
      </form>
    </li>
  );
}

export default async function ChecklistAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const couple = await portal.getCouple((await params).id);
  if (!couple) notFound();
  const month = currentMonth();

  return (
    <div className="card space-y-2">
      <div>
        <h2 className="font-display text-3xl text-forest">Checklist mes a mes</h2>
        <p className="hint">
          Cargá las tareas de cada mes. La pareja ve las pendientes de meses anteriores, las de este mes y las próximas.
        </p>
      </div>

      <form action={addChecklistTask} className="flex flex-wrap gap-2 pt-2 sm:flex-nowrap">
        <input type="hidden" name="coupleId" value={couple.id} />
        <label htmlFor="task-title" className="sr-only">Nueva tarea</label>
        <input id="task-title" name="title" required maxLength={200} placeholder="Ej: Confirmar degustación" className="field" />
        <label htmlFor="task-month" className="sr-only">Mes</label>
        <input id="task-month" name="month" type="month" defaultValue={month} className="field sm:!w-44" />
        <SubmitButton pendingText="…" className="btn-primary shrink-0">
          <Icon name="plus" className="h-4 w-4" />
          Agregar
        </SubmitButton>
      </form>

      {couple.tasks.length === 0 && <p className="py-6 text-center text-ink/50">Todavía no hay tareas.</p>}
      <ChecklistBoard tasks={couple.tasks} month={month} renderTask={(t) => <TaskRow key={t.id} coupleId={couple.id} task={t} />} />
    </div>
  );
}
