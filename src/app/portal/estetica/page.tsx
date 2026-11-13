import { AestheticForm, AestheticPhotos } from "@/components/planner/aesthetic";
import { TeamImageGallery } from "@/components/planner/team-files";
import { WebOptionsForm } from "@/components/planner/web-options";
import { MAX_AESTHETIC_PHOTOS, MAX_STATIONERY } from "@/core/portal-service";
import { removeAestheticPhoto, saveAestheticGeneral, saveAestheticWeb, uploadAestheticPhotos } from "../actions";
import { getCurrentCouple } from "../data";

export default async function AestheticPage() {
  const couple = await getCurrentCouple();
  const { aesthetic } = couple;
  const web = aesthetic.web ?? { option: null, choices: {} };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-forest">Estética</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink/70">
          Cuéntennos qué les gusta: tipografías, colores, ideas y cómo quieren su web. Nos sirve para deco, papelería y para los proveedores.
        </p>
      </div>

      <h3 className="font-display text-2xl text-forest">General</h3>
      {/* Keyed by the stored values so a save from the team's side refreshes the editors. */}
      <AestheticForm key={JSON.stringify([aesthetic.titleFont, aesthetic.bodyFont, aesthetic.ideas, aesthetic.palette])} aesthetic={aesthetic} save={saveAestheticGeneral} />
      <AestheticPhotos
        coupleId={couple.id}
        photoIds={aesthetic.photoIds}
        upload={uploadAestheticPhotos}
        remove={removeAestheticPhoto}
        max={MAX_AESTHETIC_PHOTOS}
      />
      <TeamImageGallery
        title="Papelería"
        description="Los diseños de papelería que eligieron, cargados por el equipo Weddinas."
        coupleId={couple.id}
        fileIds={couple.teamFiles.stationeryIds}
        max={MAX_STATIONERY}
        emptyText="Una vez que se elijan los diseños van a figurar acá."
      />

      <h3 className="font-display text-2xl text-forest">Web</h3>
      <WebOptionsForm
        key={JSON.stringify(web)}
        web={web}
        dressCode={couple.publicInfo.dressCode}
        weddingDate={couple.weddingDate}
        save={saveAestheticWeb}
      />
    </div>
  );
}
