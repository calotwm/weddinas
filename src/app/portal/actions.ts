"use server";

import { revalidatePath } from "next/cache";
import type { ScheduleItem, SongStatus } from "@/core/couple";
import { MAX_IMAGE_BYTES } from "@/core/uploads";
import { safeHttpUrl as safeUrl } from "@/core/url";
import { requireCoupleId } from "@/server/auth";
import { files, portal } from "@/server/container";

// Every action takes the couple id from the signed session, never from the form.

const text = (formData: FormData, key: string, max = 2000) => String(formData.get(key) ?? "").trim().slice(0, max);

export async function savePublicInfo(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();

  const times = formData.getAll("scheduleTime").map(String);
  const titles = formData.getAll("scheduleTitle").map(String);
  const schedule: ScheduleItem[] = titles
    .map((title, i) => ({ time: (times[i] ?? "").trim(), title: title.trim() }))
    .filter((item) => item.title);

  await portal.updatePublicInfo(coupleId, {
    headline: text(formData, "headline", 120),
    story: text(formData, "story"),
    venue: text(formData, "venue", 200),
    venueAddress: text(formData, "venueAddress", 300),
    mapUrl: safeUrl(text(formData, "mapUrl", 500)),
    dressCode: text(formData, "dressCode", 500),
    giftInfo: text(formData, "giftInfo", 1000),
    coverImageUrl: safeUrl(text(formData, "coverImageUrl", 500)),
    schedule,
  });
  revalidatePath("/portal", "layout");
  revalidatePath("/boda/[slug]", "page");
}

export async function respondToProposal(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  const status = formData.get("status") === "approved" ? "approved" : "rejected";
  await portal.respondToProposal(coupleId, text(formData, "proposalId", 100), status, text(formData, "comment", 1000));
  revalidatePath("/portal", "layout");
}

export async function addTask(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  const title = text(formData, "title", 200);
  if (title) await portal.addTask(coupleId, title);
  revalidatePath("/portal", "layout");
}

export async function toggleTask(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await portal.toggleTask(coupleId, text(formData, "taskId", 100));
  revalidatePath("/portal", "layout");
}

export async function deleteTask(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await portal.deleteTask(coupleId, text(formData, "taskId", 100));
  revalidatePath("/portal", "layout");
}

export async function saveMusic(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  const moments = formData.getAll("moment").map(String);
  const songs = formData.getAll("song").map((v) => String(v).slice(0, 200));
  const artists = formData.getAll("artist").map((v) => String(v).slice(0, 200));
  const statuses = formData.getAll("songStatus").map(String);
  const notes = formData.getAll("songNote").map((v) => String(v).slice(0, 500));
  await portal.saveMusic(coupleId, {
    songs: moments.map((moment, i) => ({
      moment,
      song: songs[i] ?? "",
      artist: artists[i] ?? "",
      status: (statuses[i] ?? "pending") as SongStatus,
      note: notes[i] ?? "",
    })),
    playlistUrl: safeUrl(text(formData, "playlistUrl", 500)),
    mustPlay: text(formData, "mustPlay"),
    banned: text(formData, "banned"),
  });
  revalidatePath("/", "layout");
}

export async function addFamilyMember(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  const name = text(formData, "name", 120);
  if (!name) return;
  await portal.addFamilyMember(coupleId, {
    side: formData.get("side") === "b" ? "b" : "a",
    name,
    relation: text(formData, "relation", 80),
  });
  revalidatePath("/", "layout");
}

export async function removeFamilyMember(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  const photoId = await portal.removeFamilyMember(coupleId, text(formData, "memberId", 100));
  if (photoId) await files.delete(coupleId, photoId);
  revalidatePath("/", "layout");
}

export type PhotoResult = { error?: string; ok?: number } | null;

export async function uploadFamilyPhoto(_prev: PhotoResult, formData: FormData): Promise<PhotoResult> {
  const coupleId = await requireCoupleId();
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
  try {
    const previous = await portal.setFamilyPhoto(coupleId, memberId, photoId);
    if (previous) await files.delete(coupleId, previous);
  } catch {
    await files.delete(coupleId, photoId);
    return { error: "No encontramos a esa persona. Recargá la página." };
  }
  revalidatePath("/", "layout");
  return { ok: Date.now() };
}
