import "server-only";
import { MAX_DOCUMENT_BYTES } from "@/core/uploads";
import { files, portal } from "@/server/container";

export type ReceiptResult = { error?: string; ok?: number } | null;

/** The optional receipt file of a payment form; null when none was picked. */
export function pickedReceipt(formData: FormData): File | null {
  const file = formData.get("receipt");
  return file instanceof File && file.size > 0 ? file : null;
}

/** Saves a receipt (image or PDF) with the same checks as attachments; returns its file id or the error to show. */
export async function saveReceipt(coupleId: string, file: File): Promise<{ id: string } | { error: string }> {
  if (file.size > MAX_DOCUMENT_BYTES) return { error: "El comprobante pesa más de 10 MB." };
  try {
    return { id: await files.saveDocument(coupleId, new Uint8Array(await file.arrayBuffer())) };
  } catch (e) {
    const tooLarge = e instanceof Error && e.message.includes("large");
    return { error: tooLarge ? "Las imágenes van hasta 5 MB." : "El comprobante tiene que ser PDF, JPG, PNG o WebP." };
  }
}

/** Attaches the form's receipt to an existing payment, deleting the file it replaces. */
export async function attachReceipt(coupleId: string, formData: FormData): Promise<ReceiptResult> {
  const file = pickedReceipt(formData);
  if (!file) return { error: "Elegí el comprobante." };
  const saved = await saveReceipt(coupleId, file);
  if ("error" in saved) return saved;
  const itemId = String(formData.get("itemId") ?? "").slice(0, 100);
  const paymentId = String(formData.get("paymentId") ?? "").slice(0, 100);
  let previous: string | null;
  try {
    previous = await portal.setPaymentReceipt(coupleId, itemId, paymentId, saved.id);
  } catch {
    await files.delete(coupleId, saved.id);
    return { error: "No encontramos ese pago. Recargá la página." };
  }
  // The new receipt is already saved; failing to remove the old file must not undo it.
  if (previous) await files.delete(coupleId, previous).catch(() => undefined);
  return { ok: Date.now() };
}

/** Deletes receipt files left behind by removed payments; a failure only leaves an orphan file. */
export async function deleteReceipts(coupleId: string, receiptIds: Array<string | null>): Promise<void> {
  for (const id of receiptIds) if (id) await files.delete(coupleId, id).catch(() => undefined);
}
