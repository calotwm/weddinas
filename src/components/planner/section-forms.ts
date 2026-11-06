import "server-only";
import type { GuestStatus } from "@/core/couple";
import { GUEST_STATUSES, parseGuestNames } from "@/core/guests";
import { MAX_AESTHETIC_PHOTOS, type AestheticInput, type GuestInput, type NewGuestInput, type TimingInput } from "@/core/portal-service";
import { MAX_IMAGE_BYTES } from "@/core/uploads";
import { files, portal } from "@/server/container";

// Form parsing shared by the couple's and the team's server actions for Estética, Timing and Invitados.
// Callers authorize first (requireCoupleId / requireAdmin) and pass the couple id they trust.

const text = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);

/** Several photos go up in one request; stays under the server action body limit in next.config.ts. */
const MAX_UPLOAD_BYTES = 11 * 1024 * 1024;

export type UploadResult = { error?: string; ok?: number } | null;

/** Saves the picked "photos" (sniffed and size-checked by the file store) as the couple's Estética photos. */
export async function uploadAestheticPhotos(coupleId: string, formData: FormData): Promise<UploadResult> {
  const picked = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (picked.length === 0) return { error: "Elegí al menos una foto." };
  const room = MAX_AESTHETIC_PHOTOS - ((await portal.getCouple(coupleId))?.aesthetic.photoIds.length ?? 0);
  if (picked.length > room) {
    return { error: room > 0 ? `Se pueden sumar ${room} foto${room === 1 ? "" : "s"} más.` : `Ya hay ${MAX_AESTHETIC_PHOTOS} fotos: hay que quitar alguna para sumar otra.` };
  }
  if (picked.some((f) => f.size > MAX_IMAGE_BYTES)) return { error: "Cada foto puede pesar hasta 5 MB." };
  if (picked.reduce((n, f) => n + f.size, 0) > MAX_UPLOAD_BYTES) return { error: "Entre todas pesan más de 11 MB: conviene subirlas en partes." };

  for (const file of picked) {
    let photoId: string;
    try {
      photoId = await files.saveImage(coupleId, new Uint8Array(await file.arrayBuffer()));
    } catch {
      return { error: `«${file.name.slice(0, 80)}» no es una foto en JPG, PNG o WebP.` };
    }
    try {
      await portal.addAestheticPhoto(coupleId, photoId);
    } catch {
      await files.delete(coupleId, photoId).catch(() => undefined);
      return { error: "No se pudo guardar la foto. Recargá la página." };
    }
  }
  return { ok: Date.now() };
}

export async function removeAestheticPhoto(coupleId: string, photoId: string): Promise<void> {
  const removed = await portal.removeAestheticPhoto(coupleId, photoId);
  if (removed) await files.delete(coupleId, removed).catch(() => undefined);
}

export function aestheticInput(formData: FormData): AestheticInput {
  const names = formData.getAll("paletteName").map((v) => String(v).trim().slice(0, 60));
  const hexes = formData.getAll("paletteHex").map(String);
  return {
    fonts: text(formData, "fonts", 1000),
    dressCode: text(formData, "dressCode", 500),
    palette: hexes.map((hex, i) => ({ name: names[i] ?? "", hex })),
  };
}

/** Null when the browser sent something the time and title inputs would not allow. */
export function timingInput(formData: FormData): TimingInput | null {
  const input = { time: text(formData, "time", 5), title: text(formData, "title", 120), note: text(formData, "note", 500) };
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(input.time) && input.title ? input : null;
}

export function guestInput(formData: FormData): GuestInput {
  const status = text(formData, "status", 10) as GuestStatus;
  return {
    name: text(formData, "name", 120),
    group: text(formData, "group", 80),
    status: GUEST_STATUSES.includes(status) ? status : "pending",
    table: text(formData, "table", 40),
    restriction: text(formData, "restriction", 120),
  };
}

/** The bulk paste box: one name per line, all in the same group. */
export function pastedGuests(formData: FormData): NewGuestInput[] {
  const group = text(formData, "group", 80);
  return parseGuestNames(String(formData.get("names") ?? "").slice(0, 60_000)).map((name) => ({ name, group }));
}
