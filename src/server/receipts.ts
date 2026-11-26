import "server-only";
import { MAX_DOCUMENT_BYTES } from "@/core/uploads";
import { files, portal } from "@/server/container";
import { megabytes } from "@/core/upload-limits";

export type ReceiptResult = { error?: string; ok?: number } | null;

/** The payment files picked in a form ("archivos de pago"); empty when none was picked. */
export function pickedReceipts(formData: FormData): File[] {
  return formData.getAll("receipt").filter((f): f is File => f instanceof File && f.size > 0);
}

/** Saves a receipt (image or PDF) with the same checks as attachments; returns its file id or the error to show. */
export async function saveReceipt(coupleId: string, file: File): Promise<{ id: string } | { error: string }> {
  if (file.size > MAX_DOCUMENT_BYTES) return { error: `El archivo pesa más de ${megabytes(MAX_DOCUMENT_BYTES)}.` };
  try {
    return { id: await files.saveDocument(coupleId, new Uint8Array(await file.arrayBuffer())) };
  } catch (e) {
    const tooLarge = e instanceof Error && e.message.includes("large");
    return { error: tooLarge ? "Las imágenes van hasta 5 MB." : "Los archivos de pago tienen que ser PDF, JPG, PNG o WebP." };
  }
}

/** Adds the form's files to an existing payment ("archivos de pago"); every file is saved or none is kept. */
export async function attachReceipt(coupleId: string, formData: FormData): Promise<ReceiptResult> {
  const picked = pickedReceipts(formData);
  if (picked.length === 0) return { error: "Elegí los archivos de pago." };
  const itemId = String(formData.get("itemId") ?? "").slice(0, 100);
  const paymentId = String(formData.get("paymentId") ?? "").slice(0, 100);
  const saved = await saveReceipts(coupleId, picked);
  if ("error" in saved) return saved;
  const added: string[] = [];
  try {
    for (const id of saved.ids) {
      await portal.addPaymentFile(coupleId, itemId, paymentId, id);
      added.push(id);
    }
  } catch (e) {
    await deleteReceipts(coupleId, saved.ids.filter((id) => !added.includes(id)));
    const tooMany = e instanceof Error && e.message.includes("Too many");
    return { error: tooMany ? "Un pago puede tener hasta 10 archivos." : "No encontramos ese pago. Recargá la página." };
  }
  return { ok: Date.now() };
}

/** Saves several payment files; on the first bad file deletes the ones already saved and returns the error. */
export async function saveReceipts(coupleId: string, picked: File[]): Promise<{ ids: string[] } | { error: string }> {
  if (picked.length > 10) return { error: "Un pago puede tener hasta 10 archivos." };
  const ids: string[] = [];
  for (const file of picked) {
    const saved = await saveReceipt(coupleId, file);
    if ("error" in saved) {
      await deleteReceipts(coupleId, ids);
      return { error: picked.length > 1 ? `${file.name}: ${saved.error}` : saved.error };
    }
    ids.push(saved.id);
  }
  return { ids };
}

/** Deletes receipt files left behind by removed payments; a failure only leaves an orphan file. */
export async function deleteReceipts(coupleId: string, receiptIds: Array<string | null>): Promise<void> {
  for (const id of receiptIds) if (id) await files.delete(coupleId, id).catch(() => undefined);
}
