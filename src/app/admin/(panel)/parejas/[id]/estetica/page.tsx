import { notFound } from "next/navigation";
import { AestheticForm, AestheticPhotos } from "@/components/planner/aesthetic";
import { WebOptionsForm } from "@/components/planner/web-options";
import { MAX_AESTHETIC_PHOTOS } from "@/core/portal-service";
import { removeAestheticPhoto, saveAestheticGeneral, saveAestheticWeb, uploadAestheticPhotos } from "@/app/admin/planner-actions";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

export const dynamic = "force-dynamic";

export default async function AestheticAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const couple = await portal.getCouple((await params).id);
  if (!couple) notFound();
  const { aesthetic } = couple;
  const web = aesthetic.web ?? { option: null, choices: {} };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-forest">Estética</h2>
        <p className="hint">La completa la pareja desde su portal; también la podés editar acá.</p>
      </div>

      <h3 className="font-display text-2xl text-forest">General</h3>
      {/* Keyed by the stored values so a save from the couple's side refreshes the editors. */}
      <AestheticForm
        key={JSON.stringify([aesthetic.titleFont, aesthetic.bodyFont, aesthetic.ideas, aesthetic.palette])}
        aesthetic={aesthetic}
        save={saveAestheticGeneral}
        coupleId={couple.id}
      />
      <AestheticPhotos
        coupleId={couple.id}
        photoIds={aesthetic.photoIds}
        upload={uploadAestheticPhotos}
        remove={removeAestheticPhoto}
        sendCoupleId
        max={MAX_AESTHETIC_PHOTOS}
      />

      <h3 className="font-display text-2xl text-forest">Web</h3>
      <WebOptionsForm
        key={JSON.stringify(web)}
        web={web}
        dressCode={couple.publicInfo.dressCode}
        weddingDate={couple.weddingDate}
        save={saveAestheticWeb}
        coupleId={couple.id}
      />
    </div>
  );
}
