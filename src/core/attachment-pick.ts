/**
 * Browser-side check of the files picked for an attachment upload, mirroring the server's limits (core/uploads and
 * attachment-actions). It runs before sending: a pick over the server action body limit otherwise fails with an
 * opaque error instead of a message. The server still checks the bytes.
 */

export const ATTACHMENT_MAX_FILES = 10;
/** One upload request carries at most this much (next.config.ts allows 12 MB per server action). */
export const ATTACHMENT_MAX_UPLOAD_BYTES = 11 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

export interface PickedFile {
  name: string;
  size: number;
  type: string;
}

function kind(file: PickedFile): "pdf" | "image" | "heic" | null {
  const ext = file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase();
  if (file.type === "application/pdf" || ext === "pdf") return "pdf";
  if (["image/jpeg", "image/png", "image/webp"].includes(file.type) || ["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
  if (/^image\/hei[cf]$/.test(file.type) || ext === "heic" || ext === "heif") return "heic";
  return null;
}

/** What stops this pick from uploading, as the message to show; null when it can go. */
export function attachmentPickProblem(files: PickedFile[]): string | null {
  const picked = files.filter((f) => f.size > 0);
  if (picked.length === 0) return "Elegí al menos un archivo.";
  if (picked.length > ATTACHMENT_MAX_FILES) return `Subí hasta ${ATTACHMENT_MAX_FILES} archivos por vez.`;

  const refused: string[] = [];
  for (const file of picked) {
    const k = kind(file);
    if (k === null) refused.push(`${file.name} (solo PDF, JPG, PNG o WebP)`);
    else if (k === "heic") refused.push(`${file.name} (foto de iPhone: guardala como JPG)`);
    else if (k === "image" && file.size > MAX_IMAGE_BYTES) refused.push(`${file.name} (las imágenes van hasta 5 MB)`);
    else if (k === "pdf" && file.size > MAX_PDF_BYTES) refused.push(`${file.name} (los PDF van hasta 10 MB)`);
  }
  if (refused.length > 0) return `No se pueden subir: ${refused.join(", ")}.`;

  if (picked.reduce((n, f) => n + f.size, 0) > ATTACHMENT_MAX_UPLOAD_BYTES) return "Entre todos pesan más de 11 MB. Subilos en partes.";
  return null;
}
