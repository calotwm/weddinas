"use server";

import { revalidatePath } from "next/cache";
import { clearCoverPhoto, removeStationery as dropStationery, replaceCoverPhoto, uploadStationery as saveStationery } from "@/components/planner/section-forms";
import { TEAM_FILE_SLOTS, type TeamFileSlot } from "@/core/portal-service";
import { MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES } from "@/core/uploads";
import { requireAdmin } from "@/server/auth";
import { files, portal } from "@/server/container";

// Files the team uploads for the couple to see (Papelería, timing image and link, Planos, cover photo).
// Team only: every action calls requireAdmin and takes the couple from the form.

export type TeamFileResult = { error?: string; ok?: number } | null;

const text = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);
const coupleOf = (formData: FormData) => text(formData, "coupleId", 100);
const slotOf = (formData: FormData) => {
  const slot = text(formData, "slot", 20) as TeamFileSlot;
  return TEAM_FILE_SLOTS.includes(slot) ? slot : null;
};
const refresh = () => revalidatePath("/", "layout");

export async function uploadStationery(_prev: TeamFileResult, formData: FormData): Promise<TeamFileResult> {
  await requireAdmin();
  const result = await saveStationery(coupleOf(formData), formData);
  refresh();
  return result;
}

export async function removeStationery(formData: FormData): Promise<void> {
  await requireAdmin();
  await dropStationery(coupleOf(formData), text(formData, "fileId", 100));
  refresh();
}

/** One file for a slot: the timing image takes images only, Planos also take a PDF. Replaces and deletes the previous file. */
export async function uploadTeamFile(_prev: TeamFileResult, formData: FormData): Promise<TeamFileResult> {
  await requireAdmin();
  const coupleId = coupleOf(formData);
  const slot = slotOf(formData);
  if (!slot) return { error: "No encontramos ese espacio. Recargá la página." };
  const imageOnly = slot === "timingImage";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: imageOnly ? "Elegí una imagen." : "Elegí una imagen o un PDF." };
  if (file.size > (imageOnly ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES)) {
    return { error: imageOnly ? "La imagen pesa más de 5 MB." : "El archivo pesa más de 10 MB (las imágenes, hasta 5 MB)." };
  }

  let fileId: string;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    fileId = await (imageOnly ? files.saveImage(coupleId, bytes) : files.saveDocument(coupleId, bytes));
  } catch (e) {
    if (e instanceof Error && e.message.includes("large")) return { error: "Las imágenes van hasta 5 MB." };
    return { error: imageOnly ? "Subí una imagen en JPG, PNG o WebP." : "Subí una imagen (JPG, PNG o WebP) o un PDF." };
  }
  let previous: string | null;
  try {
    previous = await portal.setTeamFile(coupleId, slot, fileId);
  } catch {
    await files.delete(coupleId, fileId).catch(() => undefined);
    return { error: "No se pudo guardar el archivo. Recargá la página." };
  }
  // The new file is already saved; failing to remove the old one must not undo it.
  if (previous) await files.delete(coupleId, previous).catch(() => undefined);
  refresh();
  return { ok: Date.now() };
}

export async function removeTeamFile(formData: FormData): Promise<void> {
  await requireAdmin();
  const coupleId = coupleOf(formData);
  const slot = slotOf(formData);
  if (!slot) return;
  const previous = await portal.setTeamFile(coupleId, slot, null);
  if (previous) await files.delete(coupleId, previous).catch(() => undefined);
  refresh();
}

export async function saveTimingSheetUrl(_prev: TeamFileResult, formData: FormData): Promise<TeamFileResult> {
  await requireAdmin();
  try {
    await portal.setTimingSheetUrl(coupleOf(formData), text(formData, "url", 2000));
  } catch {
    return { error: "El link tiene que empezar con http:// o https://." };
  }
  refresh();
  return { ok: Date.now() };
}

/** "Portada del contador": the photo behind the couple's countdown, with the same checks as the couple's upload. */
export async function uploadTeamCoverPhoto(_prev: TeamFileResult, formData: FormData): Promise<TeamFileResult> {
  await requireAdmin();
  const result = await replaceCoverPhoto(coupleOf(formData), formData);
  if (result?.ok) refresh();
  return result;
}

export async function removeTeamCoverPhoto(formData: FormData): Promise<void> {
  await requireAdmin();
  await clearCoverPhoto(coupleOf(formData));
  refresh();
}
