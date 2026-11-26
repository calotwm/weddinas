import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";
import { PortalService } from "./portal-service";
import { coverPosition } from "./url";

describe("S17 cover focus", () => {
  it("places the cover by its focus point, centered by default", () => {
    expect(coverPosition({})).toBe("50% 50%");
    expect(coverPosition({ coverFocus: { x: 30, y: 20 } })).toBe("30% 20%");
  });

  it("stores the focus clamped to whole percents, and centers it again when the photo changes", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "weddinas-cover-"));
    try {
      const service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
      const { couple } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" });
      await service.setCoverFocus(couple.id, 33.6, -4);
      expect((await service.getCouple(couple.id))!.publicInfo.coverFocus).toEqual({ x: 34, y: 0 });
      await service.setCoverFocus(couple.id, 150, 70);
      expect((await service.getCouple(couple.id))!.publicInfo.coverFocus).toEqual({ x: 100, y: 70 });
      await expect(service.setCoverFocus(couple.id, Number.NaN, 1)).rejects.toThrow();
      await service.setCoverPhoto(couple.id, "00000000-0000-4000-8000-000000000001.jpg");
      expect((await service.getCouple(couple.id))!.publicInfo).not.toHaveProperty("coverFocus");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
