"use server";

import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { CUSTOM_BLOCK_NAME_MAX } from "@/core/brief-catalog";
import { COMPARISON_LIMITS, ComparisonTableError, parseComparisonFile, type ComparisonTable } from "@/core/comparison-table";
import { importCouple, type CoupleImport } from "@/core/couple-import";
import { redirect } from "next/navigation";
import { safeHttpUrl } from "@/core/url";
import { WELCOME_TEMPLATE_MAX } from "@/core/welcome-message";
import { newPasswordProblem, TEAM_PASSWORD_LIMITS } from "@/core/team-users";
import { adminCode, allowLoginAttempt, checkTeamUser, currentTeamUser, requireAdmin, saveTeamPassword, startAdminSession, teamLoginUsesEmail } from "@/server/auth";
import { ensureDemoData, files, portal, settings } from "@/server/container";
import { uploadAttachments } from "./attachment-actions";

const text = (formData: FormData, key: string, max = 4000) => String(formData.get(key) ?? "").trim().slice(0, max);

const isLocalDateTime = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);

export type FormResult = { error?: string; code?: string; names?: string } | null;

export async function adminLogin(_prev: FormResult, formData: FormData): Promise<FormResult> {
  if (!(await allowLoginAttempt("admin"))) {
    return { error: "Demasiados intentos. Esperá unos minutos y volvé a probar." };
  }
  if (teamLoginUsesEmail()) {
    const user = await checkTeamUser(text(formData, "email", 200), String(formData.get("password") ?? "").slice(0, 200));
    if (!user) return { error: "Mail o clave incorrectos." };
    await ensureDemoData();
    await startAdminSession(user);
    redirect("/admin");
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

export type PasswordResult = { error?: string; ok?: boolean } | null;

/** A team member changes their own password: the current one is required and attempts share the login limits. */
export async function changeTeamPassword(_prev: PasswordResult, formData: FormData): Promise<PasswordResult> {
  await requireAdmin();
  const user = await currentTeamUser();
  if (!user) return { error: "Para cambiar la clave entrá con tu mail." };
  if (!(await allowLoginAttempt("admin"))) return { error: "Demasiados intentos. Esperá unos minutos y volvé a probar." };
  const raw = (key: string) => String(formData.get(key) ?? "").slice(0, TEAM_PASSWORD_LIMITS.max + 1);
  const current = raw("current");
  if ((await checkTeamUser(user, current)) !== user) return { error: "La clave actual no es correcta." };
  const next = raw("next");
  const problem = newPasswordProblem(current, next, raw("repeat"));
  if (problem) return { error: problem };
  await saveTeamPassword(user, next);
  return { ok: true };
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

export type ProposalResult = { error?: string; ok?: number } | null;

/** The comparison Excel and the PDFs travel in one request, under the server action body limit in next.config.ts. */
const NEW_PROPOSAL_MAX_BYTES = 11 * 1024 * 1024;

/**
 * "Nueva propuesta", optionally with its comparison Excel and files in the same submit. The files go through the
 * same actions as uploading them later; while they upload the proposal stays a draft, and it is only presented when
 * every file made it, so the couple never sees a half-loaded proposal.
 */
export async function addProposal(_prev: ProposalResult, formData: FormData): Promise<ProposalResult> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId", 100);
  const picked = formData.get("comparison");
  const sheet = picked instanceof File && picked.size > 0 ? picked : null;
  const docs = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if ((sheet?.size ?? 0) + docs.reduce((n, f) => n + f.size, 0) > NEW_PROPOSAL_MAX_BYTES) {
    return { error: "Entre el cuadro y los archivos pesan más de 11 MB. Creá la propuesta con menos archivos y sumá el resto desde la lista." };
  }
  const present = formData.get("intent") !== "draft";
  const withFiles = Boolean(sheet) || docs.length > 0;
  let proposalId: string;
  try {
    ({ id: proposalId } = await portal.addProposal(coupleId, {
      title: text(formData, "title", 200),
      description: text(formData, "description"),
      amount: text(formData, "amount", 100),
      link: safeHttpUrl(text(formData, "link", 500)),
      category: text(formData, "category", 60),
    }, { present: present && !withFiles }));
  } catch {
    return { error: "No se pudo crear la propuesta. Recargá la página y probá de nuevo." };
  }

  const problems: string[] = [];
  if (sheet) {
    const upload = new FormData();
    upload.set("coupleId", coupleId);
    upload.set("proposalId", proposalId);
    upload.set("file", sheet);
    const result = await uploadComparison(null, upload);
    if (result?.error) problems.push(`Cuadro comparativo: ${result.error}`);
  }
  if (docs.length > 0) {
    const upload = new FormData();
    upload.set("coupleId", coupleId);
    upload.set("targetKind", "proposal");
    upload.set("targetId", proposalId);
    for (const doc of docs) upload.append("files", doc);
    const result = await uploadAttachments(null, upload);
    if (result?.error) problems.push(result.error);
  }
  if (present && withFiles && problems.length === 0) await portal.presentProposal(coupleId, proposalId);
  revalidatePath("/", "layout");
  if (problems.length > 0) {
    return { error: `${problems.join(" ")} La propuesta quedó como borrador: corregilo desde la lista y presentala cuando esté lista.` };
  }
  return { ok: Date.now() };
}

/** The team's edit of a proposal's content, on any status. */
export async function updateProposal(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.updateProposal(text(formData, "coupleId", 100), text(formData, "proposalId", 100), {
    title: text(formData, "title", 200),
    description: text(formData, "description"),
    amount: text(formData, "amount", 100),
    link: safeHttpUrl(text(formData, "link", 500)),
    category: text(formData, "category", 60),
  });
  revalidatePath("/", "layout");
}

/** Adds a rubro outside the catalog to the couple's brief ("Otra opción"). */
export async function addCustomBriefBlock(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const name = text(formData, "name", 200);
  if (!name) return { error: "Escribí el nombre del rubro." };
  if (name.length > CUSTOM_BLOCK_NAME_MAX) return { error: `El nombre puede tener hasta ${CUSTOM_BLOCK_NAME_MAX} caracteres.` };
  try {
    await portal.addCustomBriefBlock(text(formData, "coupleId", 100), name);
  } catch {
    return { error: `"${name}" ya está en el brief o en la lista de rubros.` };
  }
  revalidatePath("/", "layout");
  return {};
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

export type ComparisonResult = { error?: string; ok?: number } | null;

/** Parses the rubro's comparison Excel and shows it inside the proposal; a new upload replaces the previous table. */
export async function uploadComparison(_prev: ComparisonResult, formData: FormData): Promise<ComparisonResult> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId", 100);
  const proposalId = text(formData, "proposalId", 100);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Elegí el cuadro comparativo (.xlsx)." };
  if (file.size > COMPARISON_LIMITS.maxBytes) return { error: "El cuadro pesa más de 5 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  let table: ComparisonTable;
  let fileId: string;
  try {
    table = await parseComparisonFile(file.name, bytes, new Date().toISOString());
    // The original stays downloadable for the team; the store checks it really is a workbook.
    fileId = await files.saveSpreadsheet(coupleId, bytes);
  } catch (e) {
    if (e instanceof ComparisonTableError) return { error: e.message };
    return { error: "El archivo no es un .xlsx válido." };
  }
  let previous: string | null;
  try {
    previous = await portal.setProposalComparison(coupleId, proposalId, table, { id: fileId, name: table.fileName, size: file.size });
  } catch {
    await files.delete(coupleId, fileId).catch(() => undefined);
    return { error: "No se encontró la propuesta. Recargá la página." };
  }
  if (previous) await files.delete(coupleId, previous).catch(() => undefined);
  revalidatePath("/", "layout");
  return { ok: Date.now() };
}

/** Removes the table together with the original file that was attached for it. */
export async function removeComparison(formData: FormData): Promise<void> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId", 100);
  const previous = await portal.setProposalComparison(coupleId, text(formData, "proposalId", 100), null);
  if (previous) await files.delete(coupleId, previous).catch(() => undefined);
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
