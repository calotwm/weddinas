import { TimingSchedule, VendorTimingTable } from "@/components/planner/timing";
import { getCurrentCouple } from "../data";

export default async function TimingPage() {
  const couple = await getCurrentCouple();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-forest">Timing</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink/70">
          El cronograma del día, momento a momento. Lo arma el equipo Weddinas con ustedes; si quieren cambiar algo, avísennos.
        </p>
      </div>
      <TimingSchedule timing={couple.timing} />
      <VendorTimingTable items={couple.vendorTiming} />
    </div>
  );
}
