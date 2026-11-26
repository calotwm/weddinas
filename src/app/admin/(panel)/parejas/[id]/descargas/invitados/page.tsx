import { GUEST_SHEET_COLUMNS, guestSheet, type GuestSheetRow } from "@/components/print/guest-sheet";
import { PrintSheet } from "@/components/print/print-sheet";
import { downloadsPath } from "@/components/print/sheets";
import { sheetCouple } from "../data";

export const dynamic = "force-dynamic";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The guest list the team sends: Apellido, Nombre, Edad, Mesa and Menú per guest. */
export default async function GuestsDownloadPage({ params }: { params: Promise<{ id: string }> }) {
  const couple = await sheetCouple(params);
  const { rows, listB, totals } = guestSheet(couple.guests);

  return (
    <PrintSheet
      couple={couple}
      title="Invitados"
      subtitle={`${plural(totals.confirmed, "confirmado")} / ${plural(totals.total, "invitado")} totales`}
      back={downloadsPath(couple.id)}
    >
      {rows.length === 0 && listB.length === 0 ? (
        <p className="text-ink/60">Todavía no hay invitados cargados.</p>
      ) : (
        <>
          <GuestTable rows={rows} />
          {listB.length > 0 && (
            <section className="space-y-2 pt-4">
              <h3 className="font-display text-2xl text-forest">Lista B ({listB.length})</h3>
              <GuestTable rows={listB} />
            </section>
          )}
        </>
      )}
    </PrintSheet>
  );
}

function GuestTable({ rows }: { rows: GuestSheetRow[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs tracking-wider text-ink/60 uppercase">
        <tr className="border-b border-forest/20">
          {GUEST_SHEET_COLUMNS.map((c) => (
            <th key={c.key} className="py-2 pr-3 font-semibold">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-forest/10">
        {rows.map((row) => (
          <tr key={row.id}>
            {GUEST_SHEET_COLUMNS.map((c) => (
              <td key={c.key} className={`py-1.5 pr-3 ${c.key === "lastName" || c.key === "name" ? "text-forest" : ""}`}>
                {row[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
