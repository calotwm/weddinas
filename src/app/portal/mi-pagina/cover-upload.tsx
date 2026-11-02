"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { removeCoverPhoto, uploadCoverPhoto } from "../actions";

function PickButton({ hasPhoto }: { hasPhoto: boolean }) {
  const { pending } = useFormStatus();
  return (
    <label htmlFor="cover-photo" aria-disabled={pending} className={`btn-primary btn-sm cursor-pointer ${pending ? "pointer-events-none opacity-60" : ""}`}>
      <Icon name="plus" className="h-3.5 w-3.5" />
      {pending ? "Subiendo…" : hasPhoto ? "Cambiar foto" : "Subir foto"}
    </label>
  );
}

/** Uploads as soon as a photo is picked; the photo replaces any pasted link on the public page. */
export function CoverUpload({ preview }: { preview: string | null }) {
  const [state, action] = useActionState(uploadCoverPhoto, null);

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="section-title">Foto de portada</h2>
        <p className="text-sm text-ink/60">Es lo primero que ven sus invitados. Mejor una foto horizontal, hasta 5 MB.</p>
      </div>
      {preview && (
        <div role="img" aria-label="Portada actual" className="aspect-[16/7] rounded-2xl bg-sand bg-cover bg-center ring-1 ring-forest/10" style={{ backgroundImage: preview }} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <form action={action}>
          <PickButton hasPhoto={!!preview} />
          <input
            id="cover-photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          />
        </form>
        {preview && (
          <form action={removeCoverPhoto}>
            <SubmitButton className="btn-ghost btn-sm" pendingText="…" confirm="¿Quitar la foto de portada?">
              <Icon name="trash" className="h-3.5 w-3.5" />
              Quitar
            </SubmitButton>
          </form>
        )}
      </div>
      {state?.error && <p role="alert" className="text-sm text-rust">{state.error}</p>}
    </section>
  );
}
