import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PortalService } from "./portal-service";

describe("only the team edits Flete/Viáticos", () => {
  const coupleActions = readFileSync(path.join(process.cwd(), "src/app/portal/actions.ts"), "utf8");
  const exported = [...coupleActions.matchAll(/export async function (\w+)/g)].map((m) => m[1]);

  it("exposes no couple action that writes a budget item's freight", () => {
    expect(exported.filter((name) => /freight/i.test(name))).toEqual([]);
    expect(coupleActions).not.toMatch(/portal\.\w*[Ff]reight\w*\(/);
  });

  it("keeps no service method to set the freight apart from the team's budget item form", () => {
    expect("setBudgetItemFreight" in PortalService.prototype).toBe(false);
  });
});
