import { notFound } from "next/navigation";
import { AestheticForm, AestheticPhotos } from "@/components/planner/aesthetic";
import { TeamFileCard, TeamImageGallery } from "@/components/planner/team-files";
import { WebOptionsForm } from "@/components/planner/web-options";
import { MAX_AESTHETIC_PHOTOS, MAX_STATIONERY } from "@/core/portal-service";
import { removeAestheticPhoto, saveAestheticGeneral, saveAestheticWeb, uploadAestheticPhotos } from "@/app/admin/planner-actions";
import { removeStationery, removeTeamCoverPhoto, setTeamCoverFocus, uploadStationery, uploadTeamCoverPhoto } from "@/app/admin/team-file-actions";
import { CoverFocusPicker } from "@/components/cover-focus-picker";
import { coverPhotoUrl } from "@/core/url";
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
      {/* Not keyed by the stored values: it saves itself as the team types, and a remount would drop what they are typing. */}
      <AestheticForm
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
        title="Elementos gráficos"
        description="Los elementos gráficos elegidos. Los subís vos; la pareja los ve en su portal"
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
      {couple.publicInfo.coverPhotoId && (
        <section className="card space-y-3">
          <h3 className="section-title">Qué parte de la portada se ve</h3>
          <CoverFocusPicker key={couple.publicInfo.coverPhotoId} imageUrl={coverPhotoUrl(couple.slug, couple.publicInfo.coverPhotoId)} focus={couple.publicInfo.coverFocus} save={setTeamCoverFocus} coupleId={couple.id} />
        </section>
      )}

      <h3 className="font-display text-2xl text-forest">Web</h3>
      <WebOptionsForm
        web={web}
        dressCode={couple.publicInfo.dressCode}
        weddingDate={couple.weddingDate}
        save={saveAestheticWeb}
        coupleId={couple.id}
      />
    </div>
  );
}
