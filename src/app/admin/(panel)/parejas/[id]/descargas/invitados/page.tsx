import { guestSheet } from "@/components/print/guest-sheet";
import { PrintSheet } from "@/components/print/print-sheet";
import { downloadsPath } from "@/components/print/sheets";
import { sheetCouple } from "../data";

export const dynamic = "force-dynamic";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The guest list to take attendance on paper: numbered rows and an empty "Llegó" box per guest. */
export default async function GuestsDownloadPage({ params }: { params: Promise<{ id: string }> }) {
  const couple = await sheetCouple(params);
  const { rows, totals } = guestSheet(couple.guests);

  return (
    <PrintSheet
      couple={couple}
      title="Invitados"
      subtitle={`${plural(totals.confirmed, "confirmado")} / ${plural(totals.total, "invitado")} totales`}
      back={downloadsPath(couple.id)}
    >
      {rows.length === 0 ? (
        <p className="text-ink/60">Todavía no hay invitados cargados.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-xs tracking-wider text-ink/60 uppercase">
            <tr className="border-b border-forest/20">
              <th className="py-2 pr-3 font-semibold">N°</th>
              <th className="py-2 pr-3 font-semibold">Apellido</th>
              <th className="py-2 pr-3 font-semibold">Nombre</th>
              <th className="py-2 pr-3 font-semibold">Mesa</th>
              <th className="py-2 pr-3 font-semibold">Menú/restricción</th>
              <th className="py-2 pr-3 font-semibold">Estado</th>
              <th className="py-2 text-center font-semibold">Llegó</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-forest/10">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-1.5 pr-3 text-ink/60 tabular-nums">{row.n}</td>
                <td className="py-1.5 pr-3 text-forest">{row.lastName}</td>
                <td className="py-1.5 pr-3 text-forest">{row.name}</td>
                <td className="py-1.5 pr-3">{row.table}</td>
                <td className="py-1.5 pr-3">{row.menu}</td>
                <td className="py-1.5 pr-3">{row.status}</td>
                <td className="py-1.5 text-center">
                  <span role="img" aria-label="Casilla para marcar si llegó" className="inline-block h-4 w-4 rounded-sm border border-ink/60 align-middle" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PrintSheet>
  );
}
