import "server-only";
import type { GuestAge, GuestStatus } from "@/core/couple";
import { GUEST_IMPORT_LIMITS, GuestImportError, parseGuestFile } from "@/core/guest-import";
import { GUEST_AGES, GUEST_STATUSES, MAX_GUESTS, parseGuestNames } from "@/core/guests";
import { MAX_AESTHETIC_PHOTOS, MAX_STATIONERY, type AestheticInput, type GuestInput, type NewGuestInput, type TimingInput } from "@/core/portal-service";
import { MAX_IMAGE_BYTES } from "@/core/uploads";
import { files, portal } from "@/server/container";

// Form parsing shared by the couple's and the team's server actions for Estética, Timing and Invitados.
// Callers authorize first (requireCoupleId / requireAdmin) and pass the couple id they trust.

const text = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);

/** Several photos go up in one request; stays under the server action body limit in next.config.ts. */
const MAX_UPLOAD_BYTES = 11 * 1024 * 1024;

export type UploadResult = { error?: string; ok?: number } | null;

/** Saves the picked "photos" (sniffed and size-checked by the file store) one by one through `add`, up to `max` in all. */
async function uploadImages(
  coupleId: string,
  formData: FormData,
  { max, current, add }: { max: number; current: number; add: (fileId: string) => Promise<void> },
): Promise<UploadResult> {
  const picked = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (picked.length === 0) return { error: "Elegí al menos una foto." };
  const room = max - current;
  if (picked.length > room) {
    return { error: room > 0 ? `Se pueden sumar ${room} foto${room === 1 ? "" : "s"} más.` : `Ya hay ${max} fotos: hay que quitar alguna para sumar otra.` };
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
      await add(photoId);
    } catch {
      await files.delete(coupleId, photoId).catch(() => undefined);
      return { error: "No se pudo guardar la foto. Recargá la página." };
    }
  }
  return { ok: Date.now() };
}

/** The couple's Estética inspiration photos. */
export async function uploadAestheticPhotos(coupleId: string, formData: FormData): Promise<UploadResult> {
  const current = (await portal.getCouple(coupleId))?.aesthetic.photoIds.length ?? 0;
  return uploadImages(coupleId, formData, { max: MAX_AESTHETIC_PHOTOS, current, add: (id) => portal.addAestheticPhoto(coupleId, id) });
}

/** Papelería: the stationery designs, uploaded by the team only (callers use requireAdmin). */
export async function uploadStationery(coupleId: string, formData: FormData): Promise<UploadResult> {
  const current = (await portal.getCouple(coupleId))?.teamFiles.stationeryIds.length ?? 0;
  return uploadImages(coupleId, formData, { max: MAX_STATIONERY, current, add: (id) => portal.addStationery(coupleId, id) });
}

export async function removeStationery(coupleId: string, fileId: string): Promise<void> {
  const removed = await portal.removeStationery(coupleId, fileId);
  if (removed) await files.delete(coupleId, removed).catch(() => undefined);
}

/** The cover photo behind the couple's countdown, uploaded by the couple or the team with the same checks. */
export async function replaceCoverPhoto(coupleId: string, formData: FormData): Promise<UploadResult> {
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
    previous = await portal.setCoverPhoto(coupleId, photoId);
  } catch {
    await files.delete(coupleId, photoId);
    return { error: "No se pudo guardar la foto. Recargá la página." };
  }
  if (previous) await files.delete(coupleId, previous).catch(() => undefined);
  return { ok: Date.now() };
}

export async function clearCoverPhoto(coupleId: string): Promise<void> {
  const previous = await portal.setCoverPhoto(coupleId, null);
  if (previous) await files.delete(coupleId, previous).catch(() => undefined);
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
  const age = text(formData, "age", 10) as GuestAge;
  const travels = text(formData, "travels", 3);
  return {
    name: text(formData, "name", 120),
    lastName: text(formData, "lastName", 80),
    group: text(formData, "group", 80),
    status: GUEST_STATUSES.includes(status) ? status : "pending",
    table: text(formData, "table", 40),
    restriction: text(formData, "restriction", 120),
    side: text(formData, "side", 80),
    transport: text(formData, "transport", 80),
    phone: text(formData, "phone", 40),
    ...(GUEST_AGES.includes(age) ? { age } : {}),
    ...(travels === "yes" ? { travels: true } : travels === "no" ? { travels: false } : {}),
  };
}

export type GuestImportResult = { error?: string; ok?: number; message?: string } | null;

/** The Excel import: adds the file's guests to the list, or replaces the list when the "mode" button says so. */
export async function importGuestList(coupleId: string, formData: FormData): Promise<GuestImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Elegí la lista de invitados (.xlsx)." };
  if (file.size > GUEST_IMPORT_LIMITS.maxBytes) return { error: "La lista pesa más de 5 MB." };
  let guests;
  try {
    guests = await parseGuestFile(file.name, new Uint8Array(await file.arrayBuffer()));
  } catch (e) {
    if (e instanceof GuestImportError) return { error: e.message };
    return { error: "No pudimos leer la lista. Descargala de nuevo como .xlsx y volvé a subirla." };
  }
  const replace = text(formData, "mode", 10) === "replace";
  try {
    const saved = replace ? await portal.replaceGuests(coupleId, guests) : await portal.addGuests(coupleId, guests);
    return { ok: Date.now(), message: `Importamos ${saved.length} invitado${saved.length === 1 ? "" : "s"}.` };
  } catch {
    const room = MAX_GUESTS - ((await portal.getCouple(coupleId))?.guests.length ?? 0);
    return {
      error: replace || room >= guests.length
        ? "No se pudo guardar la lista. Recargá la página."
        : `La lista quedaría con más de ${MAX_GUESTS} invitados: se pueden sumar ${Math.max(room, 0)} más, o reemplazar la lista.`,
    };
  }
}

/** The bulk paste box: one name per line, all in the same group. */
export function pastedGuests(formData: FormData): NewGuestInput[] {
  const group = text(formData, "group", 80);
  return parseGuestNames(String(formData.get("names") ?? "").slice(0, 60_000)).map((name) => ({ name, group }));
}
