import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { GuestSummaryView } from "@/components/planner/guest-summary";
import { GuestManager } from "@/components/planner/guests";
import { guestSummary } from "@/core/guests";
import { addGuest, addGuestList, assignRsvp, createRsvpLink, deleteGuest, dismissRsvp, importGuests, rotateRsvpLink, setGuestArrived, updateGuest } from "@/app/admin/planner-actions";
import { CopyButton } from "@/components/copy-button";
import { RsvpInbox } from "@/components/planner/rsvp-inbox";
import { siteOrigin } from "@/server/site-url";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

export const dynamic = "force-dynamic";

export default async function GuestsAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const couple = await portal.getCouple((await params).id);
  if (!couple) notFound();
  const token = await portal.currentRsvpToken(couple.id);
  const webhook = token ? `${await siteOrigin()}/api/rsvp/${couple.id}/${token}` : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-forest">Invitados</h2>
          <p className="hint">La lista la carga la pareja o la importás desde su Excel. El día del casamiento tildá &quot;Llegó&quot; para tomar lista.</p>
        </div>
        {couple.guests.length > 0 && (
          <Link href={`/admin/parejas/${couple.id}/descargas/invitados`} className="btn-ghost btn-sm">
            <Icon name="file" className="h-3.5 w-3.5" />
            Descargar
          </Link>
        )}
      </div>
      <section className="card">
        <GuestSummaryView summary={guestSummary(couple.guests)} />
      </section>
      <section className="card space-y-3">
        <div>
          <h3 className="font-display text-2xl text-forest">Conexión con la invitación web</h3>
          <p className="hint">
            En WordPress, en el formulario de confirmación: Acciones después del envío → Webhook, y pegá este link. Cada respuesta llega acá y, si el
            nombre coincide con un invitado, actualiza su confirmación y su menú.
          </p>
        </div>
        {webhook ? (
          <div className="space-y-2">
            <p className="break-all rounded-lg bg-forest/5 px-3 py-2 font-mono text-xs text-ink/80">{webhook}</p>
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton text={webhook} label="Copiar link" />
              <form action={rotateRsvpLink}>
                <input type="hidden" name="coupleId" value={couple.id} />
                <button className="btn-ghost btn-sm">Cambiar link (el anterior deja de andar)</button>
              </form>
            </div>
          </div>
        ) : (
          <form action={createRsvpLink}>
            <input type="hidden" name="coupleId" value={couple.id} />
            <button className="btn-primary btn-sm">Crear link para la web</button>
          </form>
        )}
      </section>
      <RsvpInbox entries={couple.rsvpInbox} guests={couple.guests} coupleId={couple.id} actions={{ assign: assignRsvp, dismiss: dismissRsvp }} />
      <GuestManager
        guests={couple.guests}
        coupleId={couple.id}
        actions={{ add: addGuest, addList: addGuestList, update: updateGuest, remove: deleteGuest, importList: importGuests, setArrived: setGuestArrived }}
      />
    </div>
  );
}
