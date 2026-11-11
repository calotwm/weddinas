import "server-only";
import type { FamilySide } from "@/core/couple";
import { MAX_IMAGE_BYTES } from "@/core/uploads";
import { files, portal } from "@/server/container";

// Fotos familiares form handling shared by the couple's and the team's server actions.
// Callers authorize first (requireCoupleId / requireAdmin) and pass the couple id they trust.

const text = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);

export type FamilyPhotoResult = { error?: string; ok?: number } | null;

/** Name, vínculo and "Aclaraciones" of a family member form. */
export function familyMemberInput(formData: FormData): { name: string; relation: string; notes: string } {
  return { name: text(formData, "name", 120), relation: text(formData, "relation", 80), notes: text(formData, "notes", 500) };
}

export async function addFamilyMemberFrom(coupleId: string, formData: FormData): Promise<void> {
  const input = familyMemberInput(formData);
  if (!input.name) return;
  const side: FamilySide = formData.get("side") === "b" ? "b" : "a";
  await portal.addFamilyMember(coupleId, { side, ...input });
}

export async function updateFamilyMemberFrom(coupleId: string, formData: FormData): Promise<void> {
  const input = familyMemberInput(formData);
  if (!input.name) return;
  await portal.updateFamilyMember(coupleId, text(formData, "memberId", 100), input).catch(() => undefined);
}

export async function removeFamilyMemberFrom(coupleId: string, formData: FormData): Promise<void> {
  const photoId = await portal.removeFamilyMember(coupleId, text(formData, "memberId", 100));
  if (photoId) await files.delete(coupleId, photoId);
}

/** Saves the picked "photo" as the member's reference photo and deletes the one it replaces. */
export async function saveFamilyPhoto(coupleId: string, formData: FormData): Promise<FamilyPhotoResult> {
  const memberId = text(formData, "memberId", 100);
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Elegí una foto." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "La foto pesa más de 5 MB." };

  let photoId: string;
  try {
    photoId = await files.saveImage(coupleId, new Uint8Array(await file.arrayBuffer()));
  } catch {
    return { error: "Subí una foto en JPG, PNG o WebP." };
  }
  let previous: string | null;
  try {
    previous = await portal.setFamilyPhoto(coupleId, memberId, photoId);
  } catch {
    await files.delete(coupleId, photoId);
    return { error: "No encontramos a esa persona. Recargá la página." };
  }
  // The new photo is already saved; failing to remove the old file must not undo it.
  if (previous) await files.delete(coupleId, previous).catch(() => undefined);
  return { ok: Date.now() };
}
