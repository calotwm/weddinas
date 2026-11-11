import { notFound } from "next/navigation";
import { GuestSummaryView } from "@/components/planner/guest-summary";
import { GuestManager } from "@/components/planner/guests";
import { guestSummary } from "@/core/guests";
import { addGuest, addGuestList, deleteGuest, importGuests, updateGuest } from "@/app/admin/planner-actions";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

export const dynamic = "force-dynamic";

export default async function GuestsAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const couple = await portal.getCouple((await params).id);
  if (!couple) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-forest">Invitados</h2>
        <p className="hint">La lista la carga la pareja o la importás desde su Excel; el % de confirmados no cuenta a quienes no vienen.</p>
      </div>
      <section className="card">
        <GuestSummaryView summary={guestSummary(couple.guests)} />
      </section>
      <GuestManager
        guests={couple.guests}
        coupleId={couple.id}
        actions={{ add: addGuest, addList: addGuestList, update: updateGuest, remove: deleteGuest, importList: importGuests }}
      />
    </div>
  );
}
