import { GuestSummaryView, RestrictionSummary } from "@/components/planner/guest-summary";
import { GuestManager } from "@/components/planner/guests";
import { guestSummary, restrictionSummary } from "@/core/guests";
import { RsvpInbox } from "@/components/planner/rsvp-inbox";
import { addGuest, assignRsvp, deleteGuest, dismissRsvp, importGuests, updateGuest } from "../actions";
import { getCurrentCouple } from "../data";

export default async function GuestsPage() {
  const couple = await getCurrentCouple();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-forest">Lista de invitados</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink/70">
          Carguen a sus invitados (o importen su Excel), quién confirmó, en qué mesa va cada uno y su menú.
        </p>
      </div>
      <RestrictionSummary groups={restrictionSummary(couple.guests)} />
      <section className="card">
        <GuestSummaryView summary={guestSummary(couple.guests)} />
      </section>
      <RsvpInbox entries={couple.rsvpInbox} guests={couple.guests} actions={{ assign: assignRsvp, dismiss: dismissRsvp }} />
      <GuestManager guests={couple.guests} actions={{ add: addGuest, update: updateGuest, remove: deleteGuest, importList: importGuests }} />
    </div>
  );
}
