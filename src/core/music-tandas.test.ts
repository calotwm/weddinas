import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { musicMoments, musicTandas } from "./brief-catalog";
import type { Music } from "./couple";
import { PortalService } from "./portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

const base = (over: Partial<Music>): Music => ({ songs: [], playlistUrl: "", mustPlay: "", banned: "", ...over });

describe("Tandas next to Infaltables and Prohibidas (phase 10 S11)", () => {
  it("a moment the team named «Tandas» is not a song moment: it leaves the list and its text goes to Tandas", () => {
    const music = base({
      customMoments: [{ key: "custom-1", label: "Tandas", group: "Fiesta" }, { key: "custom-2", label: "Tanda afuera y Entrada a la pista", group: "Comidas" }],
      songs: [{ moment: "custom-1", song: "Cumbia\nRock nacional", artist: "", status: "pending", note: "" }],
    });
    const keys = musicMoments(music).flatMap((g) => g.moments.map((m) => m.key));
    expect(keys).not.toContain("custom-1");
    expect(keys).toContain("custom-2");
    expect(musicTandas(music)).toBe("Cumbia\nRock nacional");
  });

  it("joins the stored Tandas text with the moment's, once each", () => {
    const music = base({ tandas: "Reggaeton", customMoments: [{ key: "k", label: " tanda ", group: "Fiesta" }], songs: [{ moment: "k", song: "Reggaeton", artist: "", status: "pending", note: "" }] });
    expect(musicTandas(music)).toBe("Reggaeton");
    expect(musicTandas(base({ tandas: "A", customMoments: [{ key: "k", label: "Tandas", group: "Fiesta" }], songs: [{ moment: "k", song: "B", artist: "", status: "pending", note: "" }] }))).toBe("A\nB");
    expect(musicTandas(base({}))).toBe("");
  });

  describe("service", () => {
    let dir: string;
    let service: PortalService;
    let coupleId: string;
    beforeEach(async () => {
      dir = mkdtempSync(path.join(tmpdir(), "weddinas-tandas-"));
      service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
      coupleId = (await service.createCouple({ partnerA: "Ana", partnerB: "Juan", weddingDate: "2027-03-20T19:00" })).couple.id;
    });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it("saves the Tandas field again", async () => {
      const stored = (await service.getCouple(coupleId))!.music;
      await service.saveMusic(coupleId, { ...stored, tandas: "  Cuarteto\nElectrónica " });
      expect((await service.getCouple(coupleId))!.music.tandas).toBe("Cuarteto\nElectrónica");
    });
  });
});

describe("music form", () => {
  it("reads Tandas when the form has the field", async () => {
    const { musicInput } = await import("@/components/planner/music");
    const form = new FormData();
    form.set("tandas", " Cumbia\nRock ");
    expect(musicInput(form).tandas).toBe("Cumbia\nRock");
  });
});
