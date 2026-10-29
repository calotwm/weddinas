import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import type { ChecklistTask } from "@/core/couple";
import { addTask, deleteTask, toggleTask } from "../actions";
import { getCurrentCouple } from "../data";

function TaskRow({ task }: { task: ChecklistTask }) {
  return (
    <li className="group flex items-center gap-3 py-3">
      <form action={toggleTask}>
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
      <span className={`flex-1 ${task.done ? "text-ink/40 line-through" : ""}`}>{task.title}</span>
      <form action={deleteTask}>
        <input type="hidden" name="taskId" value={task.id} />
        <button aria-label={`Borrar ${task.title}`} className="btn-icon opacity-60 group-hover:opacity-100">
          <Icon name="trash" className="h-4 w-4" />
        </button>
      </form>
    </li>
  );
}

export default async function ChecklistPage() {
  const { tasks } = await getCurrentCouple();
  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const progress = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;

  return (
    <div className="card mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="section-title">Nuestro checklist</h2>
          <p className="text-sm text-ink/60">{done.length} de {tasks.length} tareas listas</p>
        </div>
        <p className="font-display text-4xl text-teal">{progress}%</p>
      </div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-sand">
        <div className="h-full rounded-full bg-gradient-to-r from-mint to-teal" style={{ width: `${progress}%` }} />
      </div>

      <form action={addTask} className="flex gap-2">
        <label htmlFor="title" className="sr-only">Nueva tarea</label>
        <input id="title" name="title" required maxLength={200} className="field" placeholder="Ej: Elegir las flores del ramo" />
        <SubmitButton pendingText="…" className="btn-primary shrink-0">
          <Icon name="plus" className="h-4 w-4" />
          <span className="hidden sm:inline">Agregar</span>
        </SubmitButton>
      </form>

      {tasks.length === 0 && <p className="py-8 text-center text-ink/50">Sumen acá todo lo que no se quieren olvidar.</p>}

      {pending.length > 0 && (
        <ul className="mt-4 divide-y divide-forest/8">
          {pending.map((t) => <TaskRow key={t.id} task={t} />)}
        </ul>
      )}

      {done.length > 0 && (
        <>
          <p className="label mt-8">Listas</p>
          <ul className="divide-y divide-forest/8">
            {done.map((t) => <TaskRow key={t.id} task={t} />)}
          </ul>
        </>
      )}
    </div>
  );
}
