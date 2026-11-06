import { notFound } from "next/navigation";
import { AestheticForm, AestheticPhotos } from "@/components/planner/aesthetic";
import { MAX_AESTHETIC_PHOTOS } from "@/core/portal-service";
import { removeAestheticPhoto, saveAesthetic, uploadAestheticPhotos } from "@/app/admin/planner-actions";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

export const dynamic = "force-dynamic";

export default async function AestheticAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const couple = await portal.getCouple((await params).id);
  if (!couple) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-forest">Estética</h2>
        <p className="hint">La completa la pareja desde su portal; también la podés editar acá.</p>
      </div>
      {/* Keyed by the stored palette so a save from the couple's side refreshes the editor. */}
      <AestheticForm
        key={JSON.stringify(couple.aesthetic.palette)}
        aesthetic={couple.aesthetic}
        dressCode={couple.publicInfo.dressCode}
        save={saveAesthetic}
        coupleId={couple.id}
      />
      <AestheticPhotos
        coupleId={couple.id}
        photoIds={couple.aesthetic.photoIds}
        upload={uploadAestheticPhotos}
        remove={removeAestheticPhoto}
        sendCoupleId
        max={MAX_AESTHETIC_PHOTOS}
      />
    </div>
  );
}
