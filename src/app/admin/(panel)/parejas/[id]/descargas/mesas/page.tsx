import { PrintSheet } from "@/components/print/print-sheet";
import { downloadsPath } from "@/components/print/sheets";
import { tableSheet } from "@/core/guests";
import { sheetCouple } from "../data";

export const dynamic = "force-dynamic";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The seating by table, from the main table on, with each guest's menu; guests who declined are left out. */
export default async function TablesDownloadPage({ params }: { params: Promise<{ id: string }> }) {
  const couple = await sheetCouple(params);
  const tables = tableSheet(couple.guests);
  const seated = tables.filter((t) => t.table).length;

  return (
    <PrintSheet couple={couple} title="Mesas" subtitle={plural(seated, "mesa")} back={downloadsPath(couple.id)}>
      {tables.length === 0 ? (
        <p className="text-ink/60">Todavía no hay invitados cargados.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tables.map((t) => (
            <article key={t.table || "sin-mesa"} className="break-inside-avoid rounded-2xl p-4 ring-1 ring-forest/15">
              <h3 className="flex items-baseline justify-between gap-2 font-display text-2xl text-forest first-letter:uppercase">
                {t.table ? (/^\d+$/.test(t.table) ? `Mesa ${t.table}` : t.table) : "Sin mesa"}
                <span className="text-sm text-ink/55">{plural(t.guests.length, "invitado")}</span>
              </h3>
              <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm">
                {t.guests.map((g) => (
                  <li key={g.id}>
                    {g.name}
                    {g.restriction && !/^sin restric/i.test(g.restriction) && <span className="text-ink/55"> · {g.restriction}</span>}
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      )}
    </PrintSheet>
  );
}
