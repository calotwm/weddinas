"use server";

import { revalidatePath } from "next/cache";
import type { BlockStatus, PaymentKind } from "@/core/couple";
import type { Adjustment, Currency } from "@/core/money";
import type { BudgetItemInput } from "@/core/portal-service";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

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

function budgetItemInput(formData: FormData): BudgetItemInput {
  return {
    category: text(formData, "category", 60),
    vendor: text(formData, "vendor", 120),
    concept: text(formData, "concept", 200),
    amount: amount(formData, "amount"),
    currency: currency(formData),
    adjustment: (text(formData, "adjustment", 10) === "ipc" ? "ipc" : "frozen") as Adjustment,
    baseMonth: text(formData, "baseMonth", 7),
    note: text(formData, "note", 500),
  };
}

export async function saveBudgetItem(_prev: PlannerResult, formData: FormData): Promise<PlannerResult> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId", 100);
  const itemId = text(formData, "itemId", 100);
  const input = budgetItemInput(formData);
  if (!(input.amount > 0)) return { error: "Ingresá un monto mayor a cero." };
  if (!/^\d{4}-\d{2}$/.test(input.baseMonth)) return { error: "Elegí el mes en que se acordó el monto." };
  try {
    if (itemId) await portal.updateBudgetItem(coupleId, itemId, input);
    else await portal.addBudgetItem(coupleId, input);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    return {
      error: message.includes("currency")
        ? "No se puede cambiar la moneda de un ítem que ya tiene pagos. Borrá los pagos o creá un ítem nuevo."
        : "No se pudo guardar. Revisá el rubro y los datos.",
    };
  }
  return done();
}

export async function deleteBudgetItem(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.deleteBudgetItem(text(formData, "coupleId", 100), text(formData, "itemId", 100));
  revalidatePath("/", "layout");
}

export async function addPayment(_prev: PlannerResult, formData: FormData): Promise<PlannerResult> {
  await requireAdmin();
  const value = amount(formData, "amount");
  const rate = amount(formData, "arsPerUsd");
  const date = text(formData, "date", 10);
  if (!(value > 0)) return { error: "Ingresá el monto pagado." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Elegí la fecha del pago." };
  try {
    await portal.addPayment(text(formData, "coupleId", 100), text(formData, "itemId", 100), {
      date,
      amount: value,
      currency: currency(formData),
      arsPerUsd: rate > 0 ? rate : null,
      kind: text(formData, "kind", 10) as PaymentKind,
      note: text(formData, "note", 300),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    return { error: message.includes("exchange rate") ? "Si pagaron en otra moneda, cargá el tipo de cambio de ese día." : "No se pudo registrar el pago." };
  }
  return done();
}

export async function deletePayment(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.deletePayment(text(formData, "coupleId", 100), text(formData, "itemId", 100), text(formData, "paymentId", 100));
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
  await portal.removeBriefBlock(text(formData, "coupleId", 100), text(formData, "key", 60));
  revalidatePath("/", "layout");
}

export async function saveBriefBlock(_prev: PlannerResult, formData: FormData): Promise<PlannerResult> {
  await requireAdmin();
  const labels = formData.getAll("label").map((v) => String(v).slice(0, 120));
  const details = formData.getAll("detail").map((v) => String(v).slice(0, 2000));
  const notes = formData.getAll("fieldNote").map((v) => String(v).slice(0, 2000));
  const extra = text(formData, "newLabel", 120);
  const fields = labels.map((label, i) => ({ label, detail: details[i] ?? "", note: notes[i] ?? "" }));
  if (extra) fields.push({ label: extra, detail: text(formData, "newDetail", 2000), note: "" });
  try {
    await portal.updateBriefBlock(text(formData, "coupleId", 100), text(formData, "key", 60), {
      vendor: text(formData, "vendor", 120),
      contact: text(formData, "contact", 200),
      status: text(formData, "status", 12) as BlockStatus,
      owner: text(formData, "owner", 60),
      fields,
    });
  } catch {
    return { error: "No se pudo guardar este bloque." };
  }
  return done();
}

export async function saveIdeas(_prev: PlannerResult, formData: FormData): Promise<PlannerResult> {
  await requireAdmin();
  await portal.updateIdeas(text(formData, "coupleId", 100), text(formData, "ideas", 6000));
  return done();
}
