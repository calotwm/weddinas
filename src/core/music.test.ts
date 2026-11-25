import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { musicMoments, SONG_MOMENT_KEYS } from "./brief-catalog";
import type { Music } from "./couple";
import { PortalService } from "./portal-service";
import { musicInput, musicProgress } from "@/components/planner/music";
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

describe("music phase 8: one song field, two statuses, ordered moments", () => {
  let dir: string;
  let file: string;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-music8-"));
    file = path.join(dir, "db.json");
    service = new PortalService(new JsonCoupleRepository(file));
    coupleId = (await service.createCouple({ partnerA: "Ana", partnerB: "Juan", weddingDate: "2027-03-20T19:00" })).couple.id;
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const music = async (): Promise<Music> => (await service.getCouple(coupleId))!.music;
  const base = { songs: [], playlistUrl: "", mustPlay: "", banned: "" };

  it("reads stored artists into the song text and stored \"No aplica\" songs as pending", async () => {
    const stored = JSON.parse(JSON.stringify(await new JsonCoupleRepository(file).list()));
    stored[0].music.songs = [
      { moment: "vals", song: "Perfect", artist: "Ed Sheeran", status: "chosen", note: "" },
      { moment: "ramo", song: "Wannabe - Spice Girls", artist: "spice girls", status: "na", note: "" },
      { moment: "cierre", song: "", artist: "Los Abuelos de la Nada", status: "pending", note: "" },
    ];
    writeFileSync(file, JSON.stringify(stored));
    const m = await music();
    expect(m.songs).toEqual([
      { moment: "vals", song: "Perfect — Ed Sheeran", artist: "", status: "chosen", note: "" },
      { moment: "ramo", song: "Wannabe - Spice Girls", artist: "", status: "pending", note: "" },
      { moment: "cierre", song: "Los Abuelos de la Nada", artist: "", status: "pending", note: "" },
    ]);
  });

  it("saves songs with line breaks, merges a given artist and turns any status but chosen into pending", async () => {
    await service.saveMusic(coupleId, {
      ...base,
      songs: [
        { moment: "vals", song: "  Perfect\nversión acústica  ", artist: "", status: "chosen", note: "Entrar\ncon luces bajas" },
        { moment: "ramo", song: "Wannabe", artist: "Spice Girls", status: "na" as never, note: "" },
      ],
    });
    const m = await music();
    expect(m.songs.find((s) => s.moment === "vals")).toEqual({ moment: "vals", song: "Perfect\nversión acústica", artist: "", status: "chosen", note: "Entrar\ncon luces bajas" });
    expect(m.songs.find((s) => s.moment === "ramo")).toEqual({ moment: "ramo", song: "Wannabe — Spice Girls", artist: "", status: "pending", note: "" });
  });

  it("keeps the dragged order of the moments inside each group", async () => {
    const key = await service.addMusicMoment(coupleId, { label: "Baile sorpresa", group: "Fiesta" });
    await service.saveMusic(coupleId, { ...base, order: ["cierre", key, "vals", "entrada-pista", "inventado"] });
    let m = await music();
    const fiesta = () => musicMoments(m).find((g) => g.group === "Fiesta")!.moments.map((x) => x.key);
    expect(fiesta()).toEqual(["cierre", key, "vals", "entrada-pista", "brindis", "ramo", "whisky"]);
    expect(m.order).not.toContain("inventado");
    expect(musicMoments(m).find((g) => g.group === "Ceremonia")!.moments.map((x) => x.key)).toEqual(SONG_MOMENT_KEYS.slice(0, 7));

    await service.saveMusic(coupleId, base);
    m = await music();
    expect(fiesta()).toEqual(["cierre", key, "vals", "entrada-pista", "brindis", "ramo", "whisky"]);
  });

  it("keeps the stored party sets (tandas) when the form no longer sends them", async () => {
    await service.saveMusic(coupleId, { ...base, tandas: "1° tanda: rock nacional" });
    await service.saveMusic(coupleId, { ...base, mustPlay: "Cumbia" });
    expect(await music()).toMatchObject({ mustPlay: "Cumbia", tandas: "1° tanda: rock nacional" });
  });

  it("reads the song form without artist or tandas, in the order the rows are shown", () => {
    const form = new FormData();
    for (const [moment, title, status, note] of [
      ["cierre", "Mil horas\nen vivo", "chosen", "Con\npapelitos"],
      ["vals", "Perfect", "pending", ""],
    ]) {
      form.append("moment", moment);
      form.append("song", title);
      form.append("songStatus", status);
      form.append("songNote", note);
    }
    const input = musicInput(form);
    expect(input.order).toEqual(["cierre", "vals"]);
    expect(input.tandas).toBeUndefined();
    expect(input.songs[0]).toEqual({ moment: "cierre", song: "Mil horas\nen vivo", artist: "", status: "chosen", note: "Con\npapelitos" });
  });

  it("counts every current moment for progress, old \"No aplica\" ones as pending", () => {
    const m: Music = { ...base, songs: [song("vals", "Perfect"), { ...song("ramo", ""), status: "na" as never }] };
    expect(musicProgress(m)).toEqual({ chosen: 1, total: SONG_MOMENT_KEYS.length });
  });
});
