import { SubmitButton } from "@/components/submit-button";
import { addTask, deleteTask, toggleTask } from "../actions";
import { getCurrentCouple } from "../data";

export default async function ChecklistPage() {
  const { tasks } = await getCurrentCouple();

  return (
    <div className="card max-w-2xl">
      <form action={addTask} className="flex gap-3">
        <label htmlFor="title" className="sr-only">Nueva tarea</label>
        <input id="title" name="title" required className="field" placeholder="Ej: Elegir las flores del ramo" />
        <SubmitButton pendingText="…">Agregar</SubmitButton>
      </form>

      <ul className="mt-6 divide-y divide-forest/10">
        {tasks.length === 0 && <li className="py-4 text-ink/60">Sumen acá todo lo que no se quieren olvidar.</li>}
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <form action={toggleTask}>
              <input type="hidden" name="taskId" value={t.id} />
              <button
                aria-label={t.done ? "Marcar como pendiente" : "Marcar como lista"}
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                  t.done ? "border-teal bg-teal text-white" : "border-forest/30"
                }`}
              >
                {t.done && "✓"}
              </button>
            </form>
            <span className={`flex-1 ${t.done ? "text-ink/40 line-through" : ""}`}>{t.title}</span>
            <form action={deleteTask}>
              <input type="hidden" name="taskId" value={t.id} />
              <button aria-label={`Borrar ${t.title}`} className="px-2 text-ink/40 hover:text-rust">✕</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
