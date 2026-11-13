"use server";

import { revalidatePath } from "next/cache";
import {
  aestheticInput,
  clearCoverPhoto,
  guestInput,
  importGuestList,
  pastedGuests,
  type GuestImportResult,
  removeAestheticPhoto as dropPhoto,
  replaceCoverPhoto,
  uploadAestheticPhotos as savePhotos,
} from "@/components/planner/section-forms";
import { musicInput } from "@/components/planner/music";
import type { ScheduleItem } from "@/core/couple";
import { normalizeAlias, normalizeCbu } from "@/core/gift";
import { safeHttpUrl as safeUrl } from "@/core/url";
import { readWebForm } from "@/core/web-options";
import { requireCoupleId } from "@/server/auth";
import { portal } from "@/server/container";
import { attachReceipt, type ReceiptResult } from "@/server/receipts";
import { addFamilyMemberFrom, removeFamilyMemberFrom, saveFamilyPhoto, updateFamilyMemberFrom } from "./familia/family-forms";

// Every action takes the couple id from the signed session, never from the form.
// The couple only reads "Temas del mes" and the timing: the team owns adding, ticking, removing and editing them,
// so there are deliberately no task-creation, task-toggle, task-deletion or timing-write actions here.

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
    giftAlias: normalizeAlias(text(formData, "giftAlias", 40)),
    giftCbu: normalizeCbu(text(formData, "giftCbu", 40)),
    giftHolder: text(formData, "giftHolder", 120),
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
  revalidatePath("/admin", "layout");
}

/** "Finalista": the couple's shortlist; the service refuses drafts and discarded proposals. */
export async function setProposalFinalist(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await portal.setProposalFinalist(coupleId, text(formData, "proposalId", 100), formData.get("finalist") === "true");
  revalidatePath("/portal", "layout");
  revalidatePath("/admin", "layout");
}

export async function commentOnProposal(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  const comment = text(formData, "comment", 1000);
  if (comment) await portal.addProposalComment(coupleId, text(formData, "proposalId", 100), "couple", comment);
  revalidatePath("/portal", "layout");
  revalidatePath("/admin", "layout");
}

export async function saveMusic(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await portal.saveMusic(coupleId, musicInput(formData));
  revalidatePath("/", "layout");
}

export async function addMusicMoment(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  const label = text(formData, "label", 120);
  // A new group name wins over the selected existing group.
  const group = text(formData, "newGroup", 60) || text(formData, "group", 60);
  if (!label || !group) return;
  await portal.addMusicMoment(coupleId, { label, group });
  revalidatePath("/", "layout");
}

export async function removeMusicMoment(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await portal.removeMusicMoment(coupleId, text(formData, "moment", 60));
  revalidatePath("/", "layout");
}

export async function addFamilyMember(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await addFamilyMemberFrom(coupleId, formData);
  revalidatePath("/", "layout");
}

export async function updateFamilyMember(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await updateFamilyMemberFrom(coupleId, formData);
  revalidatePath("/", "layout");
}

export async function removeFamilyMember(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await removeFamilyMemberFrom(coupleId, formData);
  revalidatePath("/", "layout");
}

export type PhotoResult = { error?: string; ok?: number } | null;

export async function uploadFamilyPhoto(_prev: PhotoResult, formData: FormData): Promise<PhotoResult> {
  const coupleId = await requireCoupleId();
  const result = await saveFamilyPhoto(coupleId, formData);
  if (result?.ok) revalidatePath("/", "layout");
  return result;
}

export async function uploadCoverPhoto(_prev: PhotoResult, formData: FormData): Promise<PhotoResult> {
  const result = await replaceCoverPhoto(await requireCoupleId(), formData);
  if (result?.ok) revalidatePath("/", "layout");
  return result;
}

export async function removeCoverPhoto(): Promise<void> {
  await clearCoverPhoto(await requireCoupleId());
  revalidatePath("/", "layout");
}

export async function saveAesthetic(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await portal.saveAesthetic(coupleId, aestheticInput(formData));
  revalidatePath("/", "layout");
}

export async function saveAestheticGeneral(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await portal.saveAestheticGeneral(coupleId, {
    titleFont: text(formData, "titleFont", 1000),
    bodyFont: text(formData, "bodyFont", 1000),
    ideas: text(formData, "ideas", 4000),
    palette: aestheticInput(formData).palette,
  });
  revalidatePath("/", "layout");
}

export async function saveAestheticWeb(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await portal.saveAestheticWeb(coupleId, readWebForm(formData));
  revalidatePath("/", "layout");
}

export async function uploadAestheticPhotos(_prev: PhotoResult, formData: FormData): Promise<PhotoResult> {
  const coupleId = await requireCoupleId();
  const result = await savePhotos(coupleId, formData);
  // Some photos may be saved even when a later one failed.
  revalidatePath("/", "layout");
  return result;
}

export async function removeAestheticPhoto(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await dropPhoto(coupleId, text(formData, "photoId", 100));
  revalidatePath("/", "layout");
}

export async function addGuest(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await portal.addGuests(coupleId, [guestInput(formData)]).catch(() => undefined);
  revalidatePath("/", "layout");
}

export async function addGuestList(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await portal.addGuests(coupleId, pastedGuests(formData)).catch(() => undefined);
  revalidatePath("/", "layout");
}

export async function updateGuest(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await portal.updateGuest(coupleId, text(formData, "guestId", 100), guestInput(formData)).catch(() => undefined);
  revalidatePath("/", "layout");
}

export async function deleteGuest(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await portal.deleteGuest(coupleId, text(formData, "guestId", 100));
  revalidatePath("/", "layout");
}

export async function importGuests(_prev: GuestImportResult, formData: FormData): Promise<GuestImportResult> {
  const coupleId = await requireCoupleId();
  const result = await importGuestList(coupleId, formData);
  revalidatePath("/", "layout");
  return result;
}

export async function uploadPaymentReceipt(_prev: ReceiptResult, formData: FormData): Promise<ReceiptResult> {
  const coupleId = await requireCoupleId();
  const result = await attachReceipt(coupleId, formData);
  if (result?.ok) revalidatePath("/", "layout");
  return result;
}

// Answers from the invitation web that did not match a guest: the couple can assign or dismiss them too.

export async function assignRsvp(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await portal.assignRsvp(coupleId, text(formData, "entryId", 100), text(formData, "guestId", 100)).catch(() => undefined);
  revalidatePath("/portal", "layout");
}

export async function dismissRsvp(formData: FormData): Promise<void> {
  const coupleId = await requireCoupleId();
  await portal.dismissRsvp(coupleId, text(formData, "entryId", 100));
  revalidatePath("/portal", "layout");
}
