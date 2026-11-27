"use server";

import { revalidatePath } from "next/cache";
import { today } from "@/lib/format";
import {
  aestheticInput,
  guestInput,
  importGuestList,
  type GuestImportResult,
  removeAestheticPhoto as dropPhoto,
  timingInput,
  uploadAestheticPhotos as savePhotos,
} from "@/components/planner/section-forms";
import { musicInput } from "@/components/planner/music";
import {
  addFamilyMemberFrom,
  removeFamilyMemberFrom,
  saveFamilyPhoto,
  updateFamilyMemberFrom,
  type FamilyPhotoResult,
} from "@/app/portal/familia/family-forms";
import type { BlockStatus, BriefField, LineState, PaymentKind } from "@/core/couple";
import type { Adjustment, Currency } from "@/core/money";
import type { BudgetItemInput } from "@/core/portal-service";
import { readWebForm } from "@/core/web-options";
import { requireAdmin } from "@/server/auth";
import { files, portal } from "@/server/container";
import { attachReceipt, deleteReceipts, pickedReceipts, saveReceipts, type ReceiptResult } from "@/server/receipts";

const text = (formData: FormData, key: string, max = 4000) => String(formData.get(key) ?? "").trim().slice(0, max);

/** Accepts "1234.5", "1.234.567,89" and "1,234.56". */
function amount(formData: FormData, key: string): number {
  const raw = text(formData, key, 40).replace(/\s|\$|US/g, "");
  if (!raw) return NaN;
  const normalized = /,\d{1,2}$/.test(raw) ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  return Number(normalized);
}

const currency = (formData: FormData): Currency => (text(formData, "currency", 3) === "USD" ? "USD" : "ARS");

export type PlannerResult = { error?: string; ok?: number } | null;

const done = (): PlannerResult => {
  revalidatePath("/", "layout");
  return { ok: Date.now() };
};

/** The rubro select's "Nuevo rubro…" option; its name comes in `newCategory`. */
const NEW_RUBRO = "__new";

function budgetItemInput(formData: FormData): BudgetItemInput {
  return {
    category: text(formData, "category", 60),
    extraCategories: formData.getAll("extraCategory").slice(0, 40).map((v) => String(v).trim().slice(0, 60)),
    vendor: text(formData, "vendor", 120),
    concept: text(formData, "concept", 200),
    amount: amount(formData, "amount"),
    currency: currency(formData),
    adjustment: (text(formData, "adjustment", 10) === "ipc" ? "ipc" : "frozen") as Adjustment,
    baseMonth: text(formData, "baseMonth", 7),
    note: text(formData, "note", 500),
    dueDate: text(formData, "dueDate", 10),
    freight: ["yes", "no"].includes(text(formData, "freight", 3)) ? (text(formData, "freight", 3) as "yes" | "no") : undefined,
    freightPaid: formData.get("freightPaid") === "on",
    // Empty clears it; anything else must be a positive whole number (the service validates it and its rubro).
    confirmedGuests: text(formData, "confirmedGuests", 10) ? Number(text(formData, "confirmedGuests", 10)) : undefined,
  };
}

export async function saveBudgetItem(_prev: PlannerResult, formData: FormData): Promise<PlannerResult> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId", 100);
  const itemId = text(formData, "itemId", 100);
  const input = budgetItemInput(formData);
  if (!(input.amount >= 0)) return { error: "Ingresá el monto (puede ser 0)." };
  if (input.category === NEW_RUBRO) {
    const name = text(formData, "newCategory", 60);
    if (!name) return { error: "Escribí el nombre del rubro nuevo." };
    try {
      input.category = await portal.ensureRubro(coupleId, name);
    } catch {
      return { error: "No se pudo crear ese rubro. Probá con otro nombre." };
    }
  }
  // "Fletes" rows of a new item: each becomes a flete still to pay, with what it is for.
  const fletes = formData.getAll("fleteConcept").map((concept, n) => ({ concept: String(concept).trim().slice(0, 200), amount: amount(formData, `fleteAmount${n}`) }));
  if (fletes.some((f) => (f.concept || !Number.isNaN(f.amount)) && !(f.amount > 0))) return { error: "Cada flete necesita su monto." };
  if (!/^\d{4}-\d{2}$/.test(input.baseMonth)) return { error: "Elegí el mes en que se acordó el monto." };
  try {
    if (itemId) await portal.updateBudgetItem(coupleId, itemId, input);
    else {
      const created = await portal.addBudgetItem(coupleId, input);
      for (const f of fletes.filter((f) => f.amount > 0)) await portal.addBudgetCharge(coupleId, created.id, { ...f, concept: f.concept || "Flete", kind: "fletes" });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    return {
      error: message.includes("currency")
        ? "No se puede cambiar la moneda de un ítem que ya tiene pagos. Borrá los pagos o creá un ítem nuevo."
        : message.includes("Confirmed guests")
          ? "Los invitados confirmados tienen que ser un número entero mayor a cero, y solo van en Espacio, Catering, Barra y Ambientación."
          : "No se pudo guardar. Revisá el rubro y los datos.",
    };
  }
  return done();
}

export async function deleteBudgetItem(formData: FormData): Promise<void> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId", 100);
  await deleteReceipts(coupleId, await portal.deleteBudgetItem(coupleId, text(formData, "itemId", 100)));
  revalidatePath("/", "layout");
}

export async function addPayment(_prev: PlannerResult, formData: FormData): Promise<PlannerResult> {
  await requireAdmin();
  const value = amount(formData, "amount");
  const rate = amount(formData, "arsPerUsd");
  const date = text(formData, "date", 10);
  if (!(value >= 0)) return { error: "Ingresá el monto del pago (puede ser 0)." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Elegí la fecha del pago." };
  const coupleId = text(formData, "coupleId", 100);
  const saved = await saveReceipts(coupleId, pickedReceipts(formData));
  if ("error" in saved) return saved;
  try {
    await portal.addPayment(coupleId, text(formData, "itemId", 100), {
      date,
      amount: value,
      currency: currency(formData),
      arsPerUsd: rate > 0 ? rate : null,
      kind: text(formData, "kind", 10) as PaymentKind,
      note: text(formData, "note", 300),
      receiptId: saved.ids[0],
      receiptIds: saved.ids.slice(1),
      ...(formData.get("planned") === "on" && { planned: true as const }),
    });
  } catch (e) {
    await deleteReceipts(coupleId, saved.ids);
    const message = e instanceof Error ? e.message : "";
    return { error: message.includes("exchange rate") ? "Si pagaron en otra moneda, cargá el tipo de cambio de ese día." : "No se pudo registrar el pago." };
  }
  return done();
}

export async function deletePayment(formData: FormData): Promise<void> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId", 100);
  await deleteReceipts(coupleId, await portal.deletePayment(coupleId, text(formData, "itemId", 100), text(formData, "paymentId", 100)));
  revalidatePath("/", "layout");
}

export async function uploadPaymentReceipt(_prev: ReceiptResult, formData: FormData): Promise<ReceiptResult> {
  await requireAdmin();
  const result = await attachReceipt(text(formData, "coupleId", 100), formData);
  if (result?.ok) revalidatePath("/", "layout");
  return result;
}

/** Takes one "archivo de pago" off a payment and deletes the file. */
export async function removePaymentFile(formData: FormData): Promise<void> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId", 100);
  const removed = await portal.removePaymentFile(coupleId, text(formData, "itemId", 100), text(formData, "paymentId", 100), text(formData, "fileId", 100));
  await deleteReceipts(coupleId, [removed]);
  revalidatePath("/", "layout");
}

/** "Adicional por pagar": an extra charge that adds to the item's balance without a payment yet. */
export async function addBudgetCharge(_prev: PlannerResult, formData: FormData): Promise<PlannerResult> {
  await requireAdmin();
  const value = amount(formData, "amount");
  if (!(value > 0)) return { error: "Ingresá el monto del adicional." };
  try {
    await portal.addBudgetCharge(text(formData, "coupleId", 100), text(formData, "itemId", 100), {
      concept: text(formData, "concept", 200),
      amount: value,
      ...(text(formData, "kind", 10) === "fletes" && { kind: "fletes" as const }),
    });
  } catch {
    return { error: "No se pudo agregar el adicional." };
  }
  return done();
}

/** A planned payment was made today. */
export async function markPaymentPaid(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.markPaymentPaid(text(formData, "coupleId", 100), text(formData, "itemId", 100), text(formData, "paymentId", 100), today());
  revalidatePath("/", "layout");
}

/** An "adicional por pagar" was paid today: it becomes an Adicional payment. */
export async function payBudgetCharge(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.payBudgetCharge(text(formData, "coupleId", 100), text(formData, "itemId", 100), text(formData, "chargeId", 100), today());
  revalidatePath("/", "layout");
}

export async function deleteBudgetCharge(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.deleteBudgetCharge(text(formData, "coupleId", 100), text(formData, "itemId", 100), text(formData, "chargeId", 100));
  revalidatePath("/", "layout");
}

export async function saveBudgetSettings(formData: FormData): Promise<void> {
  await requireAdmin();
  const guests = Number(text(formData, "guests", 6));
  await portal.updateBudgetSettings(text(formData, "coupleId", 100), {
    usdQuote: text(formData, "usdQuote", 30) || "blue",
    guests: Number.isFinite(guests) && guests > 0 ? guests : null,
  });
  revalidatePath("/", "layout");
}

export async function addBriefBlock(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.addBriefBlock(text(formData, "coupleId", 100), text(formData, "key", 60));
  revalidatePath("/", "layout");
}

export async function removeBriefBlock(formData: FormData): Promise<void> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId", 100);
  const leftovers = await portal.removeBriefBlock(coupleId, text(formData, "key", 60));
  await Promise.all(leftovers.map((id) => files.delete(coupleId, id).catch(() => undefined)));
  revalidatePath("/", "layout");
}

export async function saveBriefBlock(_prev: PlannerResult, formData: FormData): Promise<PlannerResult> {
  await requireAdmin();
  const labels = formData.getAll("label").map((v) => String(v).slice(0, 120));
  const details = formData.getAll("detail").map((v) => String(v).slice(0, 2000));
  const notes = formData.getAll("fieldNote").map((v) => String(v).slice(0, 2000));
  const states = formData.getAll("fieldState").map(String);
  const extra = text(formData, "newLabel", 120);
  const fields: BriefField[] = labels.map((label, i) => ({ label, detail: details[i] ?? "", note: notes[i] ?? "", state: states[i] as LineState }));
  if (extra) fields.push({ label: extra, detail: text(formData, "newDetail", 2000), note: "" });
  try {
    await portal.updateBriefBlock(text(formData, "coupleId", 100), text(formData, "key", 60), {
      vendor: text(formData, "vendor", 120),
      contact: text(formData, "contact", 200),
      status: text(formData, "status", 12) as BlockStatus,
      owner: text(formData, "owner", 60),
      fields,
      // Blank goes back to the catalog name; a form without the title leaves it as it is.
      ...(formData.has("name") && { name: text(formData, "name", 60) }),
    });
  } catch {
    return { error: "No se pudo guardar este bloque." };
  }
  return done();
}

const month = (formData: FormData) => {
  const value = text(formData, "month", 7);
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : null;
};

export async function addChecklistTask(formData: FormData): Promise<void> {
  await requireAdmin();
  const title = text(formData, "title", 200);
  if (title) await portal.addTask(text(formData, "coupleId", 100), title, month(formData) ?? undefined);
  revalidatePath("/", "layout");
}

export async function setChecklistTaskMonth(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.setTaskMonth(text(formData, "coupleId", 100), text(formData, "taskId", 100), month(formData));
  revalidatePath("/", "layout");
}

/** Publishes every draft topic of the couple at once ("Publicar"). */
export async function publishChecklistTasks(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.publishTasks(text(formData, "coupleId", 100));
  revalidatePath("/", "layout");
}

export async function toggleChecklistTask(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.toggleTask(text(formData, "coupleId", 100), text(formData, "taskId", 100));
  revalidatePath("/", "layout");
}

export async function deleteChecklistTask(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.deleteTask(text(formData, "coupleId", 100), text(formData, "taskId", 100));
  revalidatePath("/", "layout");
}

export async function addMusicMoment(formData: FormData): Promise<void> {
  await requireAdmin();
  const label = text(formData, "label", 120);
  // A new group name wins over the selected existing group.
  const group = text(formData, "newGroup", 60) || text(formData, "group", 60);
  if (!label || !group) return;
  await portal.addMusicMoment(text(formData, "coupleId", 100), { label, group });
  revalidatePath("/", "layout");
}

export async function removeMusicMoment(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.removeMusicMoment(text(formData, "coupleId", 100), text(formData, "moment", 60));
  revalidatePath("/", "layout");
}

// Música and Fotos familiares: the team edits the same data the couple does, through the same forms.

export async function saveMusic(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.saveMusic(text(formData, "coupleId", 100), musicInput(formData));
  revalidatePath("/", "layout");
}

export async function addFamilyMember(formData: FormData): Promise<void> {
  await requireAdmin();
  await addFamilyMemberFrom(text(formData, "coupleId", 100), formData);
  revalidatePath("/", "layout");
}

export async function updateFamilyMember(formData: FormData): Promise<void> {
  await requireAdmin();
  await updateFamilyMemberFrom(text(formData, "coupleId", 100), formData);
  revalidatePath("/", "layout");
}

export async function removeFamilyMember(formData: FormData): Promise<void> {
  await requireAdmin();
  await removeFamilyMemberFrom(text(formData, "coupleId", 100), formData);
  revalidatePath("/", "layout");
}

export async function uploadFamilyPhoto(_prev: FamilyPhotoResult, formData: FormData): Promise<FamilyPhotoResult> {
  await requireAdmin();
  const result = await saveFamilyPhoto(text(formData, "coupleId", 100), formData);
  if (result?.ok) revalidatePath("/", "layout");
  return result;
}

export async function saveIdeas(_prev: PlannerResult, formData: FormData): Promise<PlannerResult> {
  await requireAdmin();
  await portal.updateIdeas(text(formData, "coupleId", 100), text(formData, "ideas", 6000));
  return done();
}

// Estética, Timing and Invitados: the team edits the same data the couple does.

const coupleOf = (formData: FormData) => text(formData, "coupleId", 100);
const refresh = () => revalidatePath("/", "layout");

export async function saveAesthetic(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.saveAesthetic(coupleOf(formData), aestheticInput(formData));
  refresh();
}

export async function saveAestheticGeneral(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.saveAestheticGeneral(coupleOf(formData), {
    titleFont: text(formData, "titleFont", 1000),
    bodyFont: text(formData, "bodyFont", 1000),
    ideas: text(formData, "ideas", 4000),
    palette: aestheticInput(formData).palette,
  });
  refresh();
}

export async function saveAestheticWeb(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.saveAestheticWeb(coupleOf(formData), readWebForm(formData));
  refresh();
}

export async function uploadAestheticPhotos(_prev: PlannerResult, formData: FormData): Promise<PlannerResult> {
  await requireAdmin();
  const result = await savePhotos(coupleOf(formData), formData);
  refresh();
  return result;
}

export async function removeAestheticPhoto(formData: FormData): Promise<void> {
  await requireAdmin();
  await dropPhoto(coupleOf(formData), text(formData, "photoId", 100));
  refresh();
}

export async function addTimingItem(formData: FormData): Promise<void> {
  await requireAdmin();
  const input = timingInput(formData);
  if (input) await portal.addTimingItem(coupleOf(formData), input).catch(() => undefined);
  refresh();
}

export async function updateTimingItem(formData: FormData): Promise<void> {
  await requireAdmin();
  const input = timingInput(formData);
  if (input) await portal.updateTimingItem(coupleOf(formData), text(formData, "itemId", 100), input).catch(() => undefined);
  refresh();
}

export async function deleteTimingItem(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.deleteTimingItem(coupleOf(formData), text(formData, "itemId", 100));
  refresh();
}

export async function addGuest(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.addGuests(coupleOf(formData), [guestInput(formData)]).catch(() => undefined);
  refresh();
}

/** Called by the row's autosave: a failed save throws so the row shows "No se pudo guardar". */
export async function updateGuest(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.updateGuest(coupleOf(formData), text(formData, "guestId", 100), guestInput(formData));
  refresh();
}

/** The "Llegó" tick on the day: team only, the couple's portal has no such action. Throws on failure so the tick reverts. */
export async function setGuestArrived(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.setGuestArrived(coupleOf(formData), text(formData, "guestId", 100), text(formData, "arrived", 3) === "yes");
  refresh();
}

export async function deleteGuest(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.deleteGuest(coupleOf(formData), text(formData, "guestId", 100));
  refresh();
}

export async function importGuests(_prev: GuestImportResult, formData: FormData): Promise<GuestImportResult> {
  await requireAdmin();
  const result = await importGuestList(coupleOf(formData), formData);
  refresh();
  return result;
}

// "Respuestas de la web": the Elementor invitation form posts to /api/rsvp/<coupleId>/<token>.

export async function createRsvpLink(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.rsvpToken(coupleOf(formData));
  refresh();
}

export async function assignRsvp(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.assignRsvp(coupleOf(formData), text(formData, "entryId", 100), text(formData, "guestId", 100)).catch(() => undefined);
  refresh();
}

export async function dismissRsvp(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.dismissRsvp(coupleOf(formData), text(formData, "entryId", 100));
  refresh();
}
