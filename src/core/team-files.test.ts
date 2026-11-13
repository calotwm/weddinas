import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_AESTHETIC_PHOTOS, MAX_STATIONERY, PortalService } from "./portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

const fileId = (n: number, ext = "jpg") => `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000.${ext}`;

describe("team files: inspiration, Papelería, timing image and link, Planos", () => {
  let dir: string;
  let file: string;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-team-files-"));
    file = path.join(dir, "db.json");
    service = new PortalService(new JsonCoupleRepository(file));
    ({ couple: { id: coupleId } } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" }));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const load = async () => (await service.getCouple(coupleId))!;

  it("accepts up to 20 inspiration photos", async () => {
    expect(MAX_AESTHETIC_PHOTOS).toBe(20);
    const ids = Array.from({ length: 20 }, (_, i) => fileId(i));
    for (const id of ids) await service.addAestheticPhoto(coupleId, id);
    await expect(service.addAestheticPhoto(coupleId, fileId(99))).rejects.toThrow("photos");
    expect((await load()).aesthetic.photoIds).toEqual(ids);
  });

  it("loads couples stored before team files existed with empty defaults", async () => {
    const stored = JSON.parse(readFileSync(file, "utf8"));
    delete stored[0].teamFiles;
    writeFileSync(file, JSON.stringify(stored));
    expect((await load()).teamFiles).toEqual({
      stationeryIds: [],
      timingImageId: null,
      timingSheetUrl: "",
      plans: { planA: null, planB: null, ceremony: null },
    });
  });

  describe("Papelería", () => {
    it("adds stationery images up to the limit and removes them returning the file to delete", async () => {
      const ids = Array.from({ length: MAX_STATIONERY }, (_, i) => fileId(i, i % 2 ? "png" : "webp"));
      for (const id of ids) await service.addStationery(coupleId, id);
      await expect(service.addStationery(coupleId, fileId(99))).rejects.toThrow("stationery");
      expect((await load()).teamFiles.stationeryIds).toEqual(ids);

      expect(await service.removeStationery(coupleId, ids[0])).toBe(ids[0]);
      expect(await service.removeStationery(coupleId, fileId(98))).toBeNull();
      expect((await load()).teamFiles.stationeryIds).toEqual(ids.slice(1));
    });

    it("only takes images", async () => {
      await expect(service.addStationery(coupleId, fileId(1, "pdf"))).rejects.toThrow("Invalid");
      await expect(service.addStationery(coupleId, "../db.json")).rejects.toThrow("Invalid");
      expect((await load()).teamFiles.stationeryIds).toEqual([]);
    });
  });

  describe("timing", () => {
    it("sets, replaces and clears the timing image, returning the previous file to delete", async () => {
      expect(await service.setTeamFile(coupleId, "timingImage", fileId(1))).toBeNull();
      expect(await service.setTeamFile(coupleId, "timingImage", fileId(2, "png"))).toBe(fileId(1));
      expect((await load()).teamFiles.timingImageId).toBe(fileId(2, "png"));
      expect(await service.setTeamFile(coupleId, "timingImage", null)).toBe(fileId(2, "png"));
      expect((await load()).teamFiles.timingImageId).toBeNull();
    });

    it("rejects a PDF as the timing image", async () => {
      await expect(service.setTeamFile(coupleId, "timingImage", fileId(1, "pdf"))).rejects.toThrow("Invalid");
    });

    it("saves the timing spreadsheet link only when it is http(s), and clears it with an empty text", async () => {
      await service.setTimingSheetUrl(coupleId, "  https://docs.google.com/spreadsheets/d/abc  ");
      expect((await load()).teamFiles.timingSheetUrl).toBe("https://docs.google.com/spreadsheets/d/abc");
      await expect(service.setTimingSheetUrl(coupleId, "javascript:alert(1)")).rejects.toThrow("link");
      await expect(service.setTimingSheetUrl(coupleId, "not a url")).rejects.toThrow("link");
      expect((await load()).teamFiles.timingSheetUrl).toBe("https://docs.google.com/spreadsheets/d/abc");
      await service.setTimingSheetUrl(coupleId, " ");
      expect((await load()).teamFiles.timingSheetUrl).toBe("");
    });
  });

  describe("Planos", () => {
    it("sets one image or PDF per slot, replacing and removing them with the previous file returned", async () => {
      expect(await service.setTeamFile(coupleId, "planA", fileId(1, "pdf"))).toBeNull();
      expect(await service.setTeamFile(coupleId, "planB", fileId(2))).toBeNull();
      expect(await service.setTeamFile(coupleId, "ceremony", fileId(3, "png"))).toBeNull();
      expect(await service.setTeamFile(coupleId, "planA", fileId(4))).toBe(fileId(1, "pdf"));
      expect((await load()).teamFiles.plans).toEqual({ planA: fileId(4), planB: fileId(2), ceremony: fileId(3, "png") });

      expect(await service.setTeamFile(coupleId, "planB", null)).toBe(fileId(2));
      expect((await load()).teamFiles.plans).toEqual({ planA: fileId(4), planB: null, ceremony: fileId(3, "png") });
    });

    it("rejects unknown slots and spreadsheets", async () => {
      await expect(service.setTeamFile(coupleId, "planC" as never, fileId(1))).rejects.toThrow("slot");
      await expect(service.setTeamFile(coupleId, "planA", fileId(1, "xlsx"))).rejects.toThrow("Invalid");
      expect((await load()).teamFiles.plans).toEqual({ planA: null, planB: null, ceremony: null });
    });
  });
});

// The team's cover upload (S25) goes through the same validation and setCoverPhoto as the couple's.
const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(async () => undefined),
  saveImage: vi.fn(async () => "11111111-0000-4000-8000-000000000000.jpg"),
  deleteFile: vi.fn(async () => undefined),
  setCoverPhoto: vi.fn(async () => "22222222-0000-4000-8000-000000000000.png" as string | null),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/server/container", () => ({
  files: { saveImage: mocks.saveImage, saveDocument: vi.fn(), delete: mocks.deleteFile },
  portal: { setCoverPhoto: mocks.setCoverPhoto },
}));

describe("team cover photo", () => {
  beforeEach(() => vi.clearAllMocks());

  const form = (photo?: File) => {
    const data = new FormData();
    data.set("coupleId", "c1");
    if (photo) data.set("photo", photo);
    return data;
  };

  it("lets the team set the couple's cover, deleting the previous one", async () => {
    const { uploadTeamCoverPhoto } = await import("@/app/admin/team-file-actions");
    const result = await uploadTeamCoverPhoto(null, form(new File([new Uint8Array([0xff, 0xd8, 0xff, 0])], "a.jpg")));
    expect(result?.ok).toBeTypeOf("number");
    expect(mocks.requireAdmin).toHaveBeenCalled();
    expect(mocks.setCoverPhoto).toHaveBeenCalledWith("c1", "11111111-0000-4000-8000-000000000000.jpg");
    expect(mocks.deleteFile).toHaveBeenCalledWith("c1", "22222222-0000-4000-8000-000000000000.png");
  });

  it("keeps the couple's 5 MB limit", async () => {
    const { uploadTeamCoverPhoto } = await import("@/app/admin/team-file-actions");
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.jpg");
    expect(await uploadTeamCoverPhoto(null, form(big))).toEqual({ error: "La foto pesa más de 5 MB." });
    expect(mocks.setCoverPhoto).not.toHaveBeenCalled();
  });

  it("removes the cover, deleting its file", async () => {
    const { removeTeamCoverPhoto } = await import("@/app/admin/team-file-actions");
    await removeTeamCoverPhoto(form());
    expect(mocks.requireAdmin).toHaveBeenCalled();
    expect(mocks.setCoverPhoto).toHaveBeenCalledWith("c1", null);
    expect(mocks.deleteFile).toHaveBeenCalledWith("c1", "22222222-0000-4000-8000-000000000000.png");
  });
});
