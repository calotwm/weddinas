import { TimingSchedule, VendorTimingTable } from "@/components/planner/timing";
import { PrintSheet } from "@/components/print/print-sheet";
import { downloadsPath } from "@/components/print/sheets";
import { sheetCouple } from "../data";

export const dynamic = "force-dynamic";

/** The day's schedule plus the vendors' arrival times. */
export default async function TimingDownloadPage({ params }: { params: Promise<{ id: string }> }) {
  const couple = await sheetCouple(params);
  return (
    <PrintSheet couple={couple} title="Timing" back={downloadsPath(couple.id)}>
      <TimingSchedule timing={couple.timing} />
      <VendorTimingTable items={couple.vendorTiming} />
    </PrintSheet>
  );
}
