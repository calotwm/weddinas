"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { uploadAttachments } from "./attachment-actions";

export function AttachmentUploadForm({
  coupleId,
  kind,
  targetId,
  allowInternal = false,
}: {
  coupleId: string;
  kind: "brief" | "proposal" | "report";
  targetId: string;
  allowInternal?: boolean;
}) {
  const [state, action] = useActionState(uploadAttachments, null);
  const inputId = `files-${kind}-${targetId}`;

  return (
    <form action={action} className="space-y-2 rounded-2xl bg-cream/60 p-3 ring-1 ring-forest/5">
      <input type="hidden" name="coupleId" value={coupleId} />
      <input type="hidden" name="targetKind" value={kind} />
      <input type="hidden" name="targetId" value={targetId} />
      <label htmlFor={inputId} className="label">Adjuntar archivos (PDF, JPG, PNG o WebP, hasta 10 MB)</label>
      <div className="flex flex-wrap items-center gap-2">
        <input id={inputId} name="files" type="file" multiple required accept="application/pdf,image/jpeg,image/png,image/webp" className="min-w-0 flex-1 text-sm" />
        {allowInternal && (
          <label className="flex items-center gap-1.5 text-xs text-ink/70">
            <input type="checkbox" name="internal" className="accent-forest" />
            Solo equipo
          </label>
        )}
        <SubmitButton className="btn-ghost btn-sm" pendingText="Subiendo…">
          <Icon name="plus" className="h-3.5 w-3.5" />
          Subir
        </SubmitButton>
      </div>
      {state?.error && <p role="alert" className="text-xs text-rust">{state.error}</p>}
    </form>
  );
}
