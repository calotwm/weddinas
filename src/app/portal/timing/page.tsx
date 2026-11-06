import { TimingEditor } from "@/components/planner/timing";
import { addTimingItem, deleteTimingItem, updateTimingItem } from "../actions";
import { getCurrentCouple } from "../data";

export default async function TimingPage() {
  const couple = await getCurrentCouple();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-forest">Timing</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink/70">
          El cronograma del día, momento a momento. Lo arman con el equipo Weddinas y se ordena solo por hora.
        </p>
      </div>
      <TimingEditor timing={couple.timing} actions={{ add: addTimingItem, update: updateTimingItem, remove: deleteTimingItem }} />
    </div>
  );
}
