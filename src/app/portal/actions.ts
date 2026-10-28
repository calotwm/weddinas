"use server";

import { revalidatePath } from "next/cache";
import type { ScheduleItem } from "@/core/couple";
import { requireCoupleId } from "@/server/auth";
import { portal } from "@/server/container";

// Every action takes the couple id from the signed session, never from the form.

const text = (formData: FormData, key: string, max = 2000) => String(formData.get(key) ?? "").trim().slice(0, max);

const safeUrl = (value: string) => (/^https?:\/\//i.test(value) ? value : "");

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
