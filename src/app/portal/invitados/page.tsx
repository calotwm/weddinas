import { GuestSummaryView } from "@/components/planner/guest-summary";
import { GuestManager } from "@/components/planner/guests";
import { guestSummary } from "@/core/guests";
import { addGuest, addGuestList, deleteGuest, updateGuest } from "../actions";
import { getCurrentCouple } from "../data";

export default async function GuestsPage() {
  const couple = await getCurrentCouple();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-forest">Lista de invitados</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink/70">
          Carguen a sus invitados, quién confirmó, en qué mesa va cada uno y sus restricciones alimentarias. El porcentaje de confirmados no cuenta a quienes no vienen.
        </p>
      </div>
      <section className="card">
        <GuestSummaryView summary={guestSummary(couple.guests)} />
      </section>
      <GuestManager guests={couple.guests} actions={{ add: addGuest, addList: addGuestList, update: updateGuest, remove: deleteGuest }} />
    </div>
  );
}
