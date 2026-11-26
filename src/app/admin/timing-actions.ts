"use server";

import { revalidatePath } from "next/cache";
import type { VendorTimingInput } from "@/core/portal-service";
import { normalizeClock } from "@/core/timing";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

// "Timing proveedores": the team keeps each vendor's arrival/setup times; the couple only reads them.

const text = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);

function vendorTimingInput(formData: FormData): VendorTimingInput | null {
  const input = {
    time: normalizeClock(text(formData, "time", 8)) ?? "",
    category: text(formData, "category", 80),
    company: text(formData, "company", 120),
    contact: text(formData, "contact", 200),
  };
  return input.time && input.category ? input : null;
}

export async function addVendorTimingItem(formData: FormData): Promise<void> {
  await requireAdmin();
  const input = vendorTimingInput(formData);
  if (input) await portal.addVendorTimingItem(text(formData, "coupleId", 100), input).catch(() => undefined);
  revalidatePath("/", "layout");
}

export async function updateVendorTimingItem(formData: FormData): Promise<void> {
  await requireAdmin();
  const input = vendorTimingInput(formData);
  if (input) await portal.updateVendorTimingItem(text(formData, "coupleId", 100), text(formData, "itemId", 100), input).catch(() => undefined);
  revalidatePath("/", "layout");
}

export async function deleteVendorTimingItem(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.deleteVendorTimingItem(text(formData, "coupleId", 100), text(formData, "itemId", 100));
  revalidatePath("/", "layout");
}

// The timing's team-only columns and the Horas/Minutos switch. Failures only leave the page as it was.

export async function addTimingColumn(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.addTimingColumn(text(formData, "coupleId", 100), text(formData, "name", 40)).catch(() => undefined);
  revalidatePath("/", "layout");
}

/** Called by the column name's autosave: throws on failure so the field shows it. */
export async function renameTimingColumn(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.renameTimingColumn(text(formData, "coupleId", 100), text(formData, "columnId", 100), text(formData, "name", 40));
  revalidatePath("/", "layout");
}

export async function deleteTimingColumn(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.deleteTimingColumn(text(formData, "coupleId", 100), text(formData, "columnId", 100)).catch(() => undefined);
  revalidatePath("/", "layout");
}

export async function setTimingHoursMinutesShown(formData: FormData): Promise<void> {
  await requireAdmin();
  await portal.setTimingHoursMinutesShown(text(formData, "coupleId", 100), formData.get("show") === "yes");
  revalidatePath("/", "layout");
}
