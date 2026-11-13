import { addFamilyMember, removeFamilyMember, updateFamilyMember, uploadFamilyPhoto } from "../actions";
import { getCurrentCouple } from "../data";
import { FamilyEditor } from "./family-editor";

export default async function FamilyPage() {
  const couple = await getCurrentCouple();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-forest">Fotos familiares</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink/70">
            Sumen a los familiares que quieren en las fotos y, si pueden, una foto de cada uno: así el equipo de foto y video los reconoce el día del casamiento.
          </p>
        </div>
      </div>

      <FamilyEditor
        couple={couple}
        actions={{ add: addFamilyMember, update: updateFamilyMember, remove: removeFamilyMember, upload: uploadFamilyPhoto }}
      />
    </div>
  );
}
