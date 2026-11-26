import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { endSession, requireCoupleId } from "@/server/auth";
import { portal } from "@/server/container";

/** Loads the logged-in couple once per request. */
export const getCurrentCouple = cache(async () => {
  const couple = await portal.getCouple(await requireCoupleId());
  if (!couple) {
    await endSession();
    redirect("/");
  }
  // The team's comments are internal: they never reach the couple's pages.
  return { ...couple, teamComments: [] };
});
