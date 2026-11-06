import { AestheticForm, AestheticPhotos } from "@/components/planner/aesthetic";
import { MAX_AESTHETIC_PHOTOS } from "@/core/portal-service";
import { removeAestheticPhoto, saveAesthetic, uploadAestheticPhotos } from "../actions";
import { getCurrentCouple } from "../data";

export default async function AestheticPage() {
  const couple = await getCurrentCouple();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-forest">Estética</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink/70">
          Cuéntennos qué les gusta: tipografías, colores, cómo quieren que se vistan sus invitados y fotos de ustedes. Nos sirve para deco, papelería y para los proveedores.
        </p>
      </div>
      <AestheticForm key={JSON.stringify(couple.aesthetic.palette)} aesthetic={couple.aesthetic} dressCode={couple.publicInfo.dressCode} save={saveAesthetic} />
      <AestheticPhotos
        coupleId={couple.id}
        photoIds={couple.aesthetic.photoIds}
        upload={uploadAestheticPhotos}
        remove={removeAestheticPhoto}
        max={MAX_AESTHETIC_PHOTOS}
      />
    </div>
  );
}
