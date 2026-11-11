"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/icons";
import type { FamilyPhotoResult } from "./family-forms";

function PickButton({ inputId, hasPhoto }: { inputId: string; hasPhoto: boolean }) {
  const { pending } = useFormStatus();
  return (
    <label htmlFor={inputId} aria-disabled={pending} className={`btn-ghost btn-sm cursor-pointer ${pending ? "pointer-events-none opacity-60" : ""}`}>
      <Icon name="plus" className="h-3.5 w-3.5" />
      {pending ? "Subiendo…" : hasPhoto ? "Cambiar foto" : "Subir foto"}
    </label>
  );
}

/** Uploads as soon as a photo is picked. `coupleId` goes along for the team's action; the couple's reads the session. */
export function PhotoForm({
  memberId,
  hasPhoto,
  upload,
  coupleId,
}: {
  memberId: string;
  hasPhoto: boolean;
  upload: (prev: FamilyPhotoResult, formData: FormData) => Promise<FamilyPhotoResult>;
  coupleId?: string;
}) {
  const [state, action] = useActionState(upload, null);
  const inputId = `photo-${memberId}`;

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      {coupleId && <input type="hidden" name="coupleId" value={coupleId} />}
      <input type="hidden" name="memberId" value={memberId} />
      <PickButton inputId={inputId} hasPhoto={hasPhoto} />
      <input
        id={inputId}
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      />
      {state?.error && <p role="alert" className="text-xs text-rust">{state.error}</p>}
    </form>
  );
}
