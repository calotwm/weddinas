import type { Guest, RsvpEntry } from "@/core/couple";

type Action = (formData: FormData) => Promise<void>;

const ATTENDING: Record<string, string> = { true: "Viene", false: "No viene", null: "Sin respuesta de asistencia" };

const guestName = (g: Pick<Guest, "name" | "lastName">) => [g.name, g.lastName].filter(Boolean).join(" ");

/** Answers from the invitation web: unmatched ones first, to pick the guest they belong to. */
export function RsvpInbox({
  entries,
  guests,
  coupleId,
  actions,
}: {
  entries: RsvpEntry[];
  guests: Guest[];
  coupleId?: string;
  actions: { assign: Action; dismiss: Action };
}) {
  if (entries.length === 0) return null;
  const newestFirst = [...entries].reverse();
  const pending = newestFirst.filter((e) => !e.guestId);
  const matched = newestFirst.filter((e) => e.guestId);
  const byId = new Map(guests.map((g) => [g.id, g]));
  const sorted = [...guests].sort((a, b) => guestName(a).localeCompare(guestName(b), "es"));
  const hidden = coupleId ? <input type="hidden" name="coupleId" value={coupleId} /> : null;

  const details = (e: RsvpEntry) => (
    <p className="text-sm text-ink/70">
      {ATTENDING[String(e.attending)]}
      {e.menu && ` · Menú: ${e.menu}`}
      {e.song && ` · Canción: ${e.song}`}
      {e.message && <span className="block italic">“{e.message}”</span>}
    </p>
  );

  return (
    <section className="card space-y-4">
      <div>
        <h3 className="font-display text-2xl text-forest">Respuestas de la web</h3>
        <p className="hint">Lo que confirman en la invitación. Si el nombre coincide con uno de la lista, se actualiza solo.</p>
      </div>
      {pending.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-rust">Sin asignar ({pending.length}): elegí a qué invitado corresponde</p>
          <ul className="divide-y divide-forest/8">
            {pending.map((e) => (
              <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-semibold text-forest">{e.name}</p>
                  {details(e)}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={actions.assign} className="flex items-center gap-2">
                    {hidden}
                    <input type="hidden" name="entryId" value={e.id} />
                    <select name="guestId" required className="field max-w-56 py-2" defaultValue="" aria-label={`Invitado para ${e.name}`}>
                      <option value="" disabled>
                        Elegir invitado…
                      </option>
                      {sorted.map((g) => (
                        <option key={g.id} value={g.id}>
                          {guestName(g)}
                        </option>
                      ))}
                    </select>
                    <button className="btn-ghost btn-sm">Asignar</button>
                  </form>
                  <form action={actions.dismiss}>
                    {hidden}
                    <input type="hidden" name="entryId" value={e.id} />
                    <button className="text-sm text-ink/50 underline">Quitar</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {matched.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-forest">Ya aplicadas ({matched.length})</summary>
          <ul className="mt-2 divide-y divide-forest/8">
            {matched.map((e) => {
              const guest = byId.get(e.guestId!);
              return (
                <li key={e.id} className="py-2">
                  <p className="font-semibold text-forest">
                    {e.name}
                    {guest && guestName(guest) !== e.name && <span className="font-normal text-ink/60"> → {guestName(guest)}</span>}
                  </p>
                  {details(e)}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}
