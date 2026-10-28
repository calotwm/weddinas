"use server";

import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminCode, requireAdmin, startSession } from "@/server/auth";
import { ensureDemoData, portal } from "@/server/container";

const text = (formData: FormData, key: string, max = 4000) => String(formData.get(key) ?? "").trim().slice(0, max);

const isLocalDateTime = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);

export type FormResult = { error?: string; code?: string; names?: string } | null;

export async function adminLogin(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const given = Buffer.from(text(formData, "code", 200));
  const expected = Buffer.from(adminCode());
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { error: "Código de administración incorrecto." };
  }
  await ensureDemoData();
  await startSession({ role: "admin" });
  redirect("/admin");
}

export async function createCouple(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const partnerA = text(formData, "partnerA", 80);
  const partnerB = text(formData, "partnerB", 80);
  const weddingDate = text(formData, "weddingDate", 16);
  if (!partnerA || !partnerB || !isLocalDateTime(weddingDate)) {
    return { error: "Completá los dos nombres y la fecha del casamiento." };
  }

  const { couple, accessCode } = await portal.createCouple({ partnerA, partnerB, weddingDate });
  revalidatePath("/admin");
  return { code: accessCode, names: `${couple.partnerA} & ${couple.partnerB}` };
}

export async function regenerateCode(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  return { code: await portal.regenerateCode(text(formData, "coupleId", 100)) };
}

export async function updateCouple(formData: FormData): Promise<void> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId", 100);
  const weddingDate = text(formData, "weddingDate", 16);
  await portal.updateCoupleDetails(coupleId, {
    partnerA: text(formData, "partnerA", 80),
    partnerB: text(formData, "partnerB", 80),
    weddingDate: isLocalDateTime(weddingDate) ? weddingDate : undefined,
  });
  revalidatePath("/", "layout");
}

export async function addProposal(formData: FormData): Promise<void> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId", 100);
  const link = text(formData, "link", 500);
  await portal.addProposal(coupleId, {
    title: text(formData, "title", 200),
    description: text(formData, "description"),
    amount: text(formData, "amount", 100),
    link: /^https?:\/\//i.test(link) ? link : "",
  });
  revalidatePath("/", "layout");
}

export async function deleteProposal(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.deleteProposal(text(formData, "coupleId", 100), text(formData, "proposalId", 100));
  revalidatePath("/", "layout");
}

export async function addReport(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.addReport(text(formData, "coupleId", 100), {
    title: text(formData, "title", 200),
    body: text(formData, "body"),
  });
  revalidatePath("/", "layout");
}

export async function deleteReport(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.deleteReport(text(formData, "coupleId", 100), text(formData, "reportId", 100));
  revalidatePath("/", "layout");
}
