import { notFound } from "next/navigation";
import { TimingEditor, VendorTimingEditor } from "@/components/planner/timing";
import { addTimingItem, deleteTimingItem, updateTimingItem } from "@/app/admin/planner-actions";
import { addVendorTimingItem, deleteVendorTimingItem, updateVendorTimingItem } from "@/app/admin/timing-actions";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

export const dynamic = "force-dynamic";

export default async function TimingAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const couple = await portal.getCouple((await params).id);
  if (!couple) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-forest">Timing</h2>
        <p className="hint">El cronograma del día; la pareja lo ve y lo edita desde su portal · {couple.timing.length} momento{couple.timing.length === 1 ? "" : "s"}.</p>
      </div>
      <TimingEditor
        timing={couple.timing}
        coupleId={couple.id}
        actions={{ add: addTimingItem, update: updateTimingItem, remove: deleteTimingItem }}
      />
      <VendorTimingEditor
        items={couple.vendorTiming}
        coupleId={couple.id}
        actions={{ add: addVendorTimingItem, update: updateVendorTimingItem, remove: deleteVendorTimingItem }}
      />
    </div>
  );
}
