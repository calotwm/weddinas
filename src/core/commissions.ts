import { TEAM_FIELD } from "./brief-catalog";
import type { Couple } from "./couple";

export interface CommissionLine {
  blockKey: string;
  blockName: string;
  vendor: string;
  /** What the team wrote in the rubro's "Equipo" row. */
  detail: string;
}

export interface CommissionGroup<C extends Pick<Couple, "brief">> {
  couple: C;
  lines: CommissionLine[];
}

/** "Comisiones": per couple, each vendor rubro whose team-only "Equipo" row has something written, in brief order. */
export function commissionGroups<C extends Pick<Couple, "brief">>(couples: C[]): CommissionGroup<C>[] {
  return couples
    .map((couple) => ({
      couple,
      lines: couple.brief
        .filter((b) => b.kind === "vendor")
        .flatMap((b) => {
          const detail = b.fields.find((f) => f.label === TEAM_FIELD)?.detail.trim() ?? "";
          return detail ? [{ blockKey: b.key, blockName: b.name, vendor: b.vendor, detail }] : [];
        }),
    }))
    .filter((g) => g.lines.length > 0);
}
