import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { endSession, requireCoupleId } from "@/server/auth";
import { portal } from "@/server/container";
import { coupleTiming } from "@/core/timing";

/** Loads the logged-in couple once per request. */
export const getCurrentCouple = cache(async () => {
  const couple = await portal.getCouple(await requireCoupleId());
  if (!couple) {
    await endSession();
    redirect("/");
  }
  // The team's comments, team-only timing moments and the timing's team columns are internal: they never reach the couple.
  return {
    ...couple,
    teamComments: [],
    timing: coupleTiming(couple.timing),
    timingSettings: { showHoursMinutes: couple.timingSettings.showHoursMinutes, columns: [] },
  };
});
