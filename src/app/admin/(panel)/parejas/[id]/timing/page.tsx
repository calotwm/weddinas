import { notFound } from "next/navigation";
import { TeamFileCard, TimingSheetLinkForm } from "@/components/planner/team-files";
import { TimingEditor, VendorTimingEditor } from "@/components/planner/timing";
import { addTimingItem, deleteTimingItem, updateTimingItem } from "@/app/admin/planner-actions";
import { addVendorTimingItem, deleteVendorTimingItem, updateVendorTimingItem } from "@/app/admin/timing-actions";
import { removeTeamFile, saveTimingSheetUrl, uploadTeamFile } from "@/app/admin/team-file-actions";
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
      <TimingSheetLinkForm key={couple.teamFiles.timingSheetUrl} coupleId={couple.id} url={couple.teamFiles.timingSheetUrl} save={saveTimingSheetUrl} />
      <TeamFileCard
        title="Imagen del timing"
        description="Una imagen de tu Excel de timing; la pareja la ve arriba de su cronograma."
        coupleId={couple.id}
        fileId={couple.teamFiles.timingImageId}
        emptyText=""
        edit={{ upload: uploadTeamFile, remove: removeTeamFile, fields: { coupleId: couple.id, slot: "timingImage" }, inputName: "file", accept: "image" }}
      />
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
