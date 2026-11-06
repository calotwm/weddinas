import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { accessCodeFor, hashAccessCode, normalizeAccessCode } from "./access-code";
import type { Couple } from "./couple";
import { PortalService } from "./portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

describe("easy access codes", () => {
  it("joins the first names with Y and adds the 2-digit wedding year", () => {
    expect(accessCodeFor("Delfi", "Juancho", "2027-03-20T19:00")).toBe("DELFIYJUANCHO27");
  });

  it("uses only the first word and strips accents and symbols", () => {
    expect(accessCodeFor("  María José ", "Íñigo-Luis", "2026-11-06T20:00")).toBe("MARIAYINIGOLUIS26");
    expect(accessCodeFor("Sofía", "D'Angelo", "2030-01-01T10:00")).toBe("SOFIAYDANGELO30");
    expect(accessCodeFor("Maximilianoalejandro", "Constantinopla", "2027-01-01T10:00")).toBe("MAXIMILIANOAYCONSTANTINOP27");
  });

  it("normalizes login input ignoring case, spaces and accents", () => {
    expect(normalizeAccessCode(" delfi y juancho 27 ")).toBe("DELFIYJUANCHO27");
    expect(hashAccessCode("Délfiyjuancho27")).toBe(hashAccessCode("DELFIYJUANCHO27"));
  });

  it("keeps old XXXX-XXXX codes normalized the same way", () => {
    expect(normalizeAccessCode(" abcd efgh ")).toBe("ABCD-EFGH");
    expect(hashAccessCode("abcdefgh")).toBe(hashAccessCode("ABCD-EFGH"));
  });
});

describe("PortalService access codes", () => {
  let dir: string;
  let repo: JsonCoupleRepository;
  let service: PortalService;
  const input = { partnerA: "Delfi", partnerB: "Juancho", weddingDate: "2027-03-20T19:00" };

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-code-"));
    repo = new JsonCoupleRepository(path.join(dir, "db.json"));
    service = new PortalService(repo);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("creates couples with the easy code and logs in with it", async () => {
    const { couple, accessCode } = await service.createCouple(input);
    expect(accessCode).toBe("DELFIYJUANCHO27");
    expect((await service.login("delfiyjuancho27"))?.id).toBe(couple.id);
  });

  it("appends 2, 3… when the code is taken", async () => {
    expect((await service.createCouple(input)).accessCode).toBe("DELFIYJUANCHO27");
    expect((await service.createCouple(input)).accessCode).toBe("DELFIYJUANCHO272");
    expect((await service.createCouple(input)).accessCode).toBe("DELFIYJUANCHO273");
  });

  it("still logs in couples whose stored code is an old XXXX-XXXX one", async () => {
    const { couple } = await service.createCouple(input);
    const stored = (await repo.findById(couple.id)) as Couple;
    await repo.save({ ...stored, accessCodeHash: hashAccessCode("ABCD-EF23") });
    expect((await service.login("abcd ef23"))?.id).toBe(couple.id);
    expect(await service.login("DELFIYJUANCHO27")).toBeNull();
  });

  it("regenerates an easy code and invalidates the previous one", async () => {
    const { couple } = await service.createCouple(input);
    const stored = (await repo.findById(couple.id)) as Couple;
    await repo.save({ ...stored, accessCodeHash: hashAccessCode("ABCD-EF23") });

    const code = await service.regenerateCode(couple.id);
    expect(code).toBe("DELFIYJUANCHO27");
    expect(await service.login("ABCD-EF23")).toBeNull();
    expect((await service.login(code))?.id).toBe(couple.id);

    const again = await service.regenerateCode(couple.id);
    expect(again).not.toBe(code);
    expect(await service.login(code)).toBeNull();
    expect((await service.login(again))?.id).toBe(couple.id);
  });

  it("uses the easy code for imported couples too", async () => {
    const { importCouple } = await import("./couple-import");
    expect((await importCouple(service, input)).accessCode).toBe("DELFIYJUANCHO27");
  });
});
