import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { ChecklistBoard } from "@/components/planner/checklist";
import { SubmitButton } from "@/components/submit-button";
import { WhatsappButton } from "@/components/whatsapp-button";
import type { ChecklistTask } from "@/core/couple";
import { monthTopics, monthTopicsMessage } from "@/core/whatsapp";
import { currentMonth } from "@/lib/format";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";
import { siteOrigin } from "@/server/site-url";
import { addChecklistTask, deleteChecklistTask, publishChecklistTasks, setChecklistTaskMonth, toggleChecklistTask } from "@/app/admin/planner-actions";

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
      <span className={`min-w-40 flex-1 ${task.done ? "text-ink/40 line-through" : ""}`}>
        {task.title}
        {task.draft && <span className="chip ml-2 bg-sand py-0.5 text-ink/70 normal-case tracking-normal">Borrador</span>}
      </span>
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
  const { topics, overdue } = monthTopics(couple.tasks, month);
  const message = monthTopicsMessage(couple.partnerA, couple.partnerB, topics, overdue, `${await siteOrigin()}/portal/checklist`);
  const drafts = couple.tasks.filter((t) => t.draft).length;

  return (
    <div className="card space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl text-forest">Temas del mes</h2>
          <p className="hint">
            Cargá las tareas de cada mes. Las nuevas quedan en borrador hasta que las publiques; después la pareja ve las
            pendientes de meses anteriores, las de este mes y las próximas.
          </p>
        </div>
        <WhatsappButton phone={couple.whatsapp} text={message}>Enviar temas por WhatsApp</WhatsappButton>
      </div>

      {drafts > 0 && (
        <form action={publishChecklistTasks} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sand/60 px-4 py-3">
          <input type="hidden" name="coupleId" value={couple.id} />
          <p className="text-sm text-ink/75">
            {drafts === 1 ? "Hay 1 tema en borrador que la pareja todavía no ve." : `Hay ${drafts} temas en borrador que la pareja todavía no ve.`}
          </p>
          <SubmitButton className="btn-primary btn-sm" pendingText="Publicando…">
            Publicar {drafts === 1 ? "borrador" : "borradores"}
          </SubmitButton>
        </form>
      )}

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
