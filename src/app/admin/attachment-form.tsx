"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { attachmentPickProblem } from "@/core/attachment-pick";
import { uploadAttachments } from "./attachment-actions";
import { ANY_FILE_ACCEPT, MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES, megabytes, UPLOAD_REQUEST_MAX_BYTES } from "@/core/upload-limits";

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
  const [pickProblem, setPickProblem] = useState<string | null>(null);
  const inputId = `files-${kind}-${targetId}`;
  const error = pickProblem ?? state?.error;

  // Checked before sending: a pick over the upload limit otherwise fails with a generic error and nothing uploads.
  function check(e: React.FormEvent<HTMLFormElement>) {
    const picked = new FormData(e.currentTarget).getAll("files").filter((f): f is File => f instanceof File);
    const problem = attachmentPickProblem(picked);
    setPickProblem(problem);
    if (problem) e.preventDefault();
  }

  return (
    <form action={action} onSubmit={check} onChange={() => setPickProblem(null)} className="space-y-2 rounded-2xl bg-cream/60 p-3 ring-1 ring-forest/5">
      <input type="hidden" name="coupleId" value={coupleId} />
      <input type="hidden" name="targetKind" value={kind} />
      <input type="hidden" name="targetId" value={targetId} />
      <label htmlFor={inputId} className="label">Adjuntar archivos (PDF hasta {megabytes(MAX_DOCUMENT_BYTES)}; JPG, PNG o WebP hasta {megabytes(MAX_IMAGE_BYTES)}; hasta {megabytes(UPLOAD_REQUEST_MAX_BYTES)} por vez)</label>
      <div className="flex flex-wrap items-center gap-2">
        <input id={inputId} name="files" type="file" multiple required accept={ANY_FILE_ACCEPT} className="min-w-0 flex-1 text-sm" />
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
      {error && <p role="alert" className="text-xs text-rust">{error}</p>}
    </form>
  );
}
