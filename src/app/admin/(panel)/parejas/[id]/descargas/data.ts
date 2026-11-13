import "server-only";
import { notFound } from "next/navigation";
import type { CoupleView } from "@/core/couple";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

/** The couple behind a team download page: team only, 404 for unknown couples. */
export async function sheetCouple(params: Promise<{ id: string }>): Promise<CoupleView> {
  await requireAdmin();
  const couple = await portal.getCouple((await params).id);
  if (!couple) notFound();
  return couple;
}
