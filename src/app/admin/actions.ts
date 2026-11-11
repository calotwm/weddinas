"use server";

import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { importCouple, type CoupleImport } from "@/core/couple-import";
import { redirect } from "next/navigation";
import { safeHttpUrl } from "@/core/url";
import { WELCOME_TEMPLATE_MAX } from "@/core/welcome-message";
import { adminCode, allowLoginAttempt, requireAdmin, startAdminSession } from "@/server/auth";
import { ensureDemoData, files, portal, settings } from "@/server/container";

const text = (formData: FormData, key: string, max = 4000) => String(formData.get(key) ?? "").trim().slice(0, max);

const isLocalDateTime = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);

export type FormResult = { error?: string; code?: string; names?: string } | null;

export async function adminLogin(_prev: FormResult, formData: FormData): Promise<FormResult> {
  if (!(await allowLoginAttempt("admin"))) {
    return { error: "Demasiados intentos. Esperá unos minutos y volvé a probar." };
  }
  const given = Buffer.from(text(formData, "code", 200));
  const expected = Buffer.from(adminCode());
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { error: "Código de administración incorrecto." };
  }
  await ensureDemoData();
  await startAdminSession();
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

/** Imports a whole couple from a JSON file built from the planners' spreadsheets. */
export async function importCoupleFile(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Elegí el archivo .json de la pareja." };
  if (file.size > 1_000_000) return { error: "El archivo pesa más de 1 MB." };
  let data: CoupleImport;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return { error: "El archivo no es un JSON válido." };
  }
  try {
    const { accessCode } = await importCouple(portal, data);
    revalidatePath("/admin");
    return { code: accessCode, names: `${data.partnerA.trim()} & ${data.partnerB.trim()}` };
  } catch (e) {
    return { error: `No se importó nada: ${e instanceof Error ? e.message : "datos inválidos"}.` };
  }
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
    whatsapp: text(formData, "whatsapp", 25),
  });
  revalidatePath("/", "layout");
}

export async function addProposal(formData: FormData): Promise<void> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId", 100);
  await portal.addProposal(coupleId, {
    title: text(formData, "title", 200),
    description: text(formData, "description"),
    amount: text(formData, "amount", 100),
    link: safeHttpUrl(text(formData, "link", 500)),
    category: text(formData, "category", 60),
  }, { present: formData.get("intent") !== "draft" });
  revalidatePath("/", "layout");
}

export async function replyToProposal(formData: FormData): Promise<void> {
  await requireAdmin();
  const comment = text(formData, "comment", 1000);
  if (comment) await portal.addProposalComment(text(formData, "coupleId", 100), text(formData, "proposalId", 100), "team", comment);
  revalidatePath("/", "layout");
}

export async function presentProposal(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.presentProposal(text(formData, "coupleId", 100), text(formData, "proposalId", 100));
  revalidatePath("/", "layout");
}

export async function deleteProposal(formData: FormData): Promise<void> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId", 100);
  const leftovers = await portal.deleteProposal(coupleId, text(formData, "proposalId", 100));
  await Promise.all(leftovers.map((id) => files.delete(coupleId, id).catch(() => undefined)));
  revalidatePath("/", "layout");
}

export async function deleteReport(formData: FormData): Promise<void> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId", 100);
  const leftovers = await portal.deleteReport(coupleId, text(formData, "reportId", 100));
  await Promise.all(leftovers.map((id) => files.delete(coupleId, id).catch(() => undefined)));
  revalidatePath("/", "layout");
}

export type TemplateResult = { error?: string; saved?: boolean } | null;

/** Saves the welcome message template; "Volver al texto original" (or a blank text) restores the default. */
export async function saveWelcomeTemplate(_prev: TemplateResult, formData: FormData): Promise<TemplateResult> {
  await requireAdmin();
  const raw = String(formData.get("template") ?? "").replace(/\r\n/g, "\n").trim();
  if (raw.length > WELCOME_TEMPLATE_MAX) return { error: `El mensaje puede tener hasta ${WELCOME_TEMPLATE_MAX} caracteres.` };
  const reset = formData.get("intent") === "reset" || !raw;
  // An undefined template is dropped from the JSON file, so the default text applies again.
  await settings.save({ ...(await settings.get()), welcomeTemplate: reset ? undefined : raw });
  revalidatePath("/admin", "layout");
  return { saved: true };
}
