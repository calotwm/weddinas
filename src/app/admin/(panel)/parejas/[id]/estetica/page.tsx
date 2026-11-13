import { notFound } from "next/navigation";
import { AestheticForm, AestheticPhotos } from "@/components/planner/aesthetic";
import { TeamFileCard, TeamImageGallery } from "@/components/planner/team-files";
import { WebOptionsForm } from "@/components/planner/web-options";
import { MAX_AESTHETIC_PHOTOS, MAX_STATIONERY } from "@/core/portal-service";
import { removeAestheticPhoto, saveAestheticGeneral, saveAestheticWeb, uploadAestheticPhotos } from "@/app/admin/planner-actions";
import { removeStationery, removeTeamCoverPhoto, uploadStationery, uploadTeamCoverPhoto } from "@/app/admin/team-file-actions";
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
      <TeamImageGallery
        title="Papelería"
        description="Los diseños de papelería elegidos. Los subís vos; la pareja los ve en su portal"
        coupleId={couple.id}
        fileIds={couple.teamFiles.stationeryIds}
        max={MAX_STATIONERY}
        emptyText="Una vez que se elijan los diseños van a figurar acá."
        edit={{ upload: uploadStationery, remove: removeStationery }}
      />
      <TeamFileCard
        title="Portada del contador"
        description="La foto de la pareja que aparece detrás de la cuenta regresiva en su portal."
        coupleId={couple.id}
        fileId={couple.publicInfo.coverPhotoId ?? null}
        emptyText="Todavía no hay portada."
        edit={{ upload: uploadTeamCoverPhoto, remove: removeTeamCoverPhoto, fields: { coupleId: couple.id }, inputName: "photo", accept: "image" }}
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
