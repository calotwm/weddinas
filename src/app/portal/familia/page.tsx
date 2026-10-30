import { Icon } from "@/components/icons";
import { FamilyColumns } from "@/components/planner/family";
import { SubmitButton } from "@/components/submit-button";
import { addFamilyMember, removeFamilyMember } from "../actions";
import { getCurrentCouple } from "../data";
import { PhotoForm } from "./photo-form";

export default async function FamilyPage() {
  const couple = await getCurrentCouple();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl text-forest">Fotos familiares</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink/70">
          Sumen a los familiares que quieren en las fotos y, si pueden, una foto de cada uno: así el equipo de foto y video los reconoce el día del casamiento.
        </p>
      </div>

      <form action={addFamilyMember} className="card grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <div>
          <label htmlFor="fm-name" className="label">Nombre</label>
          <input id="fm-name" name="name" required maxLength={120} placeholder="Ej: Abuela Elena" className="field" />
        </div>
        <div>
          <label htmlFor="fm-relation" className="label">Vínculo</label>
          <input id="fm-relation" name="relation" maxLength={80} placeholder="Ej: Abuela, tío, padrino" className="field" />
        </div>
        <div>
          <label htmlFor="fm-side" className="label">Familia de</label>
          <select id="fm-side" name="side" className="field">
            <option value="a">{couple.partnerA}</option>
            <option value="b">{couple.partnerB}</option>
          </select>
        </div>
        <SubmitButton pendingText="Sumando…">
          <Icon name="plus" className="h-4 w-4" />
          Sumar
        </SubmitButton>
      </form>

      <FamilyColumns
        coupleId={couple.id}
        family={couple.family}
        sides={{ a: couple.partnerA, b: couple.partnerB }}
        action={(m) => (
          <div className="flex items-center gap-1">
            <PhotoForm memberId={m.id} hasPhoto={!!m.photoId} />
            <form action={removeFamilyMember}>
              <input type="hidden" name="memberId" value={m.id} />
              <SubmitButton className="btn-icon" pendingText="…" confirm={`¿Quitar a ${m.name}?`}>
                <Icon name="trash" className="h-4 w-4" />
                <span className="sr-only">Quitar a {m.name}</span>
              </SubmitButton>
            </form>
          </div>
        )}
      />
    </div>
  );
}
