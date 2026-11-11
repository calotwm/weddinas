"use server";

import { revalidatePath } from "next/cache";
import type { VendorTimingInput } from "@/core/portal-service";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

// "Timing proveedores": the team keeps each vendor's arrival/setup times; the couple only reads them.

const text = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);

function vendorTimingInput(formData: FormData): VendorTimingInput | null {
  const input = {
    time: text(formData, "time", 5),
    category: text(formData, "category", 80),
    company: text(formData, "company", 120),
    contact: text(formData, "contact", 200),
  };
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(input.time) && input.category ? input : null;
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
