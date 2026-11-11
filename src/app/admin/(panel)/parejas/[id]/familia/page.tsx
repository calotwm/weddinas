import { notFound } from "next/navigation";
import { addFamilyMember, removeFamilyMember, updateFamilyMember, uploadFamilyPhoto } from "@/app/admin/planner-actions";
import { FamilyEditor } from "@/app/portal/familia/family-editor";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

export const dynamic = "force-dynamic";

export default async function FamilyAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const couple = await portal.getCouple((await params).id);
  if (!couple) notFound();
  const withPhoto = couple.family.filter((m) => m.photoId).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-forest">Fotos familiares</h2>
        <p className="hint">
          La completa la pareja para que foto y video reconozcan a cada familiar; vos también podés sumar, editar o quitar · {withPhoto} de {couple.family.length} con foto.
        </p>
      </div>
      <FamilyEditor
        couple={couple}
        coupleId={couple.id}
        actions={{ add: addFamilyMember, update: updateFamilyMember, remove: removeFamilyMember, upload: uploadFamilyPhoto }}
      />
    </div>
  );
}
