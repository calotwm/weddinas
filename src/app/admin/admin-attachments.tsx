import { AttachmentList } from "@/components/attachments";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import type { Attachment } from "@/core/couple";
import { removeAttachment } from "./attachment-actions";
import { AttachmentUploadForm } from "./attachment-form";

/** Team view of a block's, proposal's or report's files: list with delete, plus the upload form. */
export function AdminAttachments({
  coupleId,
  kind,
  targetId,
  attachments,
  allowInternal = false,
}: {
  coupleId: string;
  kind: "brief" | "proposal" | "report";
  targetId: string;
  attachments: Attachment[] | undefined;
  allowInternal?: boolean;
}) {
  return (
    <div className="space-y-3">
      <AttachmentList
        coupleId={coupleId}
        attachments={attachments}
        includeInternal
        action={(a) => (
          <form action={removeAttachment}>
            <input type="hidden" name="coupleId" value={coupleId} />
            <input type="hidden" name="targetKind" value={kind} />
            <input type="hidden" name="targetId" value={targetId} />
            <input type="hidden" name="fileId" value={a.id} />
            <SubmitButton className="btn-icon bg-white/90 shadow-soft" pendingText="…" confirm={`¿Borrar "${a.name}"?`}>
              <Icon name="trash" className="h-4 w-4" />
              <span className="sr-only">Borrar {a.name}</span>
            </SubmitButton>
          </form>
        )}
      />
      <AttachmentUploadForm coupleId={coupleId} kind={kind} targetId={targetId} allowInternal={allowInternal} />
    </div>
  );
}
