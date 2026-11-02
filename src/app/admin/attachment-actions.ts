"use server";

import { revalidatePath } from "next/cache";
import type { AttachmentTarget } from "@/core/portal-service";
import { MAX_DOCUMENT_BYTES } from "@/core/uploads";
import { requireAdmin } from "@/server/auth";
import { files, portal } from "@/server/container";

const text = (formData: FormData, key: string, max = 200) => String(formData.get(key) ?? "").trim().slice(0, max);

const MAX_FILES = 10;
// Stays under the server action body limit in next.config.ts.
const MAX_UPLOAD_BYTES = 11 * 1024 * 1024;

function target(formData: FormData): AttachmentTarget | null {
  const kind = text(formData, "targetKind", 10);
  const ref = text(formData, "targetId", 100);
  if (!ref) return null;
  if (kind === "brief") return { kind, key: ref };
  if (kind === "proposal" || kind === "report") return { kind, id: ref };
  return null;
}

export type AttachmentResult = { error?: string; ok?: number } | null;

export async function uploadAttachments(_prev: AttachmentResult, formData: FormData): Promise<AttachmentResult> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId", 100);
  const to = target(formData);
  const picked = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!to) return { error: "No se encontró dónde adjuntar. Recargá la página." };
  if (picked.length === 0) return { error: "Elegí al menos un archivo." };
  if (picked.length > MAX_FILES) return { error: `Subí hasta ${MAX_FILES} archivos por vez.` };
  if (picked.reduce((n, f) => n + f.size, 0) > MAX_UPLOAD_BYTES) return { error: "Entre todos pesan más de 11 MB. Subilos en partes." };

  const skipped: string[] = [];
  for (const file of picked) {
    if (file.size > MAX_DOCUMENT_BYTES) {
      skipped.push(`${file.name} (pesa más de 10 MB)`);
      continue;
    }
    let id: string;
    try {
      id = await files.saveDocument(coupleId, new Uint8Array(await file.arrayBuffer()));
    } catch (e) {
      const tooLarge = e instanceof Error && e.message.includes("large");
      skipped.push(`${file.name} (${tooLarge ? "las imágenes van hasta 5 MB" : "solo PDF, JPG, PNG o WebP"})`);
      continue;
    }
    try {
      await portal.addAttachment(coupleId, to, { id, name: file.name, size: file.size, internal: formData.get("internal") === "on" });
    } catch {
      await files.delete(coupleId, id);
      return { error: "No se encontró dónde adjuntar. Recargá la página." };
    }
  }
  revalidatePath("/", "layout");
  return skipped.length > 0 ? { error: `No se subieron: ${skipped.join(", ")}.`, ok: Date.now() } : { ok: Date.now() };
}

export async function removeAttachment(formData: FormData): Promise<void> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId", 100);
  const to = target(formData);
  if (!to) return;
  const removed = await portal.removeAttachment(coupleId, to, text(formData, "fileId", 100));
  if (removed) await files.delete(coupleId, removed).catch(() => undefined);
  revalidatePath("/", "layout");
}
