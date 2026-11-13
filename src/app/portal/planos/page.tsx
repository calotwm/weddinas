import { TeamFileCard } from "@/components/planner/team-files";
import { PLAN_SLOT_LABELS, PLAN_SLOTS } from "@/core/couple";
import { getCurrentCouple } from "../data";

export default async function PlansPage() {
  const couple = await getCurrentCouple();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-forest">Planos</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink/70">Los planos del salón y la ubicación de la ceremonia. Los carga el equipo Weddinas.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {PLAN_SLOTS.map((slot) => (
          <TeamFileCard
            key={slot}
            title={PLAN_SLOT_LABELS[slot]}
            coupleId={couple.id}
            fileId={couple.teamFiles.plans[slot]}
            emptyText="Cuando el equipo lo cargue, va a figurar acá."
          />
        ))}
      </div>
    </div>
  );
}
