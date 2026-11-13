import { notFound } from "next/navigation";
import { TeamFileCard } from "@/components/planner/team-files";
import { PLAN_SLOT_LABELS, PLAN_SLOTS } from "@/core/couple";
import { removeTeamFile, uploadTeamFile } from "@/app/admin/team-file-actions";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

export const dynamic = "force-dynamic";

export default async function PlansAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const couple = await portal.getCouple((await params).id);
  if (!couple) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-forest">Planos</h2>
        <p className="hint">Subí una imagen o un PDF por plano; la pareja los ve en su portal, sin poder cambiarlos.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {PLAN_SLOTS.map((slot) => (
          <TeamFileCard
            key={slot}
            title={PLAN_SLOT_LABELS[slot]}
            coupleId={couple.id}
            fileId={couple.teamFiles.plans[slot]}
            emptyText=""
            edit={{ upload: uploadTeamFile, remove: removeTeamFile, fields: { coupleId: couple.id, slot }, inputName: "file", accept: "document" }}
          />
        ))}
      </div>
    </div>
  );
}
