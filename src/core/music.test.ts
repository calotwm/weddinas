import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { musicMoments, SONG_MOMENT_KEYS } from "./brief-catalog";
import type { Music } from "./couple";
import { PortalService } from "./portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

const song = (moment: string, title: string) => ({ moment, song: title, artist: "", status: "chosen" as const, note: "" });

describe("music moments", () => {
  let dir: string;
  let file: string;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-music-"));
    file = path.join(dir, "db.json");
    service = new PortalService(new JsonCoupleRepository(file));
    coupleId = (await service.createCouple({ partnerA: "Ana", partnerB: "Juan", weddingDate: "2027-03-20T19:00" })).couple.id;
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const music = async (): Promise<Music> => (await service.getCouple(coupleId))!.music;

  it("adds a moment to an existing group and to a new group", async () => {
    const key = await service.addMusicMoment(coupleId, { label: "Baile sorpresa", group: "Fiesta" });
    await service.addMusicMoment(coupleId, { label: "Llegada al after", group: "After" });
    const groups = musicMoments(await music());
    const fiesta = groups.find((g) => g.group === "Fiesta")!;
    expect(fiesta.moments.at(-1)).toMatchObject({ key, label: "Baile sorpresa", custom: true });
    expect(groups.at(-1)).toMatchObject({ group: "After", moments: [{ label: "Llegada al after", custom: true }] });
  });

  it("rejects a moment without label or group", async () => {
    await expect(service.addMusicMoment(coupleId, { label: " ", group: "Fiesta" })).rejects.toThrow();
    await expect(service.addMusicMoment(coupleId, { label: "Algo", group: "" })).rejects.toThrow();
  });

  it("hides default moments and deletes custom ones", async () => {
    const key = await service.addMusicMoment(coupleId, { label: "Baile sorpresa", group: "Fiesta" });
    await service.removeMusicMoment(coupleId, "vals");
    await service.removeMusicMoment(coupleId, key);
    const m = await music();
    expect(m.hiddenMoments).toEqual(["vals"]);
    expect(m.customMoments).toEqual([]);
    const keys = musicMoments(m).flatMap((g) => g.moments.map((x) => x.key));
    expect(keys).not.toContain("vals");
    expect(keys).not.toContain(key);
    expect(m.songs.map((s) => s.moment)).not.toContain("vals");
  });

  it("drops a group once all its moments are removed", async () => {
    for (const key of ["recepcion", "plato-principal", "postre"]) await service.removeMusicMoment(coupleId, key);
    expect(musicMoments(await music()).map((g) => g.group)).toEqual(["Ceremonia", "Fiesta"]);
  });

  it("saves songs for custom moments and ignores removed ones", async () => {
    const key = await service.addMusicMoment(coupleId, { label: "Baile sorpresa", group: "Fiesta" });
    await service.removeMusicMoment(coupleId, "vals");
    await service.saveMusic(coupleId, {
      songs: [song(key, "Thriller"), song("vals", "Danubio azul"), song("cierre", "Ciudad mágica")],
      playlistUrl: "",
      mustPlay: "",
      banned: "",
    });
    const m = await music();
    expect(m.songs.find((s) => s.moment === key)?.song).toBe("Thriller");
    expect(m.songs.find((s) => s.moment === "cierre")?.song).toBe("Ciudad mágica");
    expect(m.songs.find((s) => s.moment === "vals")).toBeUndefined();
    expect(m.customMoments).toHaveLength(1);
  });

  it("loads music stored before editable moments existed", async () => {
    const stored = JSON.parse(JSON.stringify(await new JsonCoupleRepository(file).list()));
    delete stored[0].music.customMoments;
    delete stored[0].music.hiddenMoments;
    writeFileSync(file, JSON.stringify(stored));
    const m = await music();
    expect(m.customMoments).toEqual([]);
    expect(musicMoments(m).flatMap((g) => g.moments.map((x) => x.key))).toEqual(SONG_MOMENT_KEYS);
  });
});
