import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateAccessCode, hashAccessCode, normalizeAccessCode } from "./access-code";
import { getCountdown } from "./countdown";
import { PortalService } from "./portal-service";
import { signSession, verifySession } from "./session";
import { slugify } from "./slug";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

describe("access codes", () => {
  it("generates codes in XXXX-XXXX format without ambiguous characters", () => {
    const code = generateAccessCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });

  it("normalizes case, spaces and missing dash", () => {
    expect(normalizeAccessCode(" abcd efgh ")).toBe("ABCD-EFGH");
    expect(normalizeAccessCode("abcdefgh")).toBe("ABCD-EFGH");
  });

  it("hashes equivalent inputs to the same value", () => {
    expect(hashAccessCode("abcd-efgh")).toBe(hashAccessCode("ABCDEFGH"));
    expect(hashAccessCode("ABCD-EFGH")).not.toContain("ABCD");
  });
});

describe("countdown", () => {
  it("splits the remaining time into days, hours, minutes and seconds", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const target = new Date("2026-01-03T05:06:07Z");
    expect(getCountdown(target, now)).toEqual({ days: 2, hours: 5, minutes: 6, seconds: 7, isPast: false });
  });

  it("reports past dates with zeros", () => {
    const now = new Date("2026-01-02T00:00:00Z");
    expect(getCountdown(new Date("2026-01-01T00:00:00Z"), now)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: true,
    });
  });
});

describe("slugify", () => {
  it("builds url-safe slugs without accents", () => {
    expect(slugify("Sofía & Martín")).toBe("sofia-y-martin");
  });
});

describe("session", () => {
  it("round-trips a signed payload", () => {
    const token = signSession({ role: "couple", coupleId: "c1" }, "secret");
    expect(verifySession(token, "secret")).toEqual({ role: "couple", coupleId: "c1" });
  });

  it("rejects tampered tokens and wrong secrets", () => {
    const token = signSession({ role: "couple", coupleId: "c1" }, "secret");
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ role: "admin" })).toString("base64url");
    expect(verifySession(`${forged}.${sig}`, "secret")).toBeNull();
    expect(verifySession(`${body}.${sig}`, "other")).toBeNull();
    expect(verifySession("garbage", "secret")).toBeNull();
  });
});

describe("PortalService", () => {
  let dir: string;
  let service: PortalService;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-"));
    service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("creates a couple with a unique slug and logs in with its code", async () => {
    const first = await service.createCouple({ partnerA: "Sofía", partnerB: "Martín", weddingDate: "2027-03-20T19:00" });
    const second = await service.createCouple({ partnerA: "Sofía", partnerB: "Martín", weddingDate: "2027-04-20T19:00" });

    expect(first.couple.slug).toBe("sofia-y-martin");
    expect(second.couple.slug).toBe("sofia-y-martin-2");
    expect(first.couple).not.toHaveProperty("accessCode");

    const logged = await service.login(first.accessCode.toLowerCase());
    expect(logged?.id).toBe(first.couple.id);
    expect(await service.login("ZZZZ-ZZZZ")).toBeNull();
  });

  it("regenerating a code invalidates the previous one", async () => {
    const { couple, accessCode } = await service.createCouple({ partnerA: "A", partnerB: "B", weddingDate: "2027-01-01T20:00" });
    const newCode = await service.regenerateCode(couple.id);

    expect(await service.login(accessCode)).toBeNull();
    expect((await service.login(newCode))?.id).toBe(couple.id);
  });

  it("lets the couple update public info shown on the public page", async () => {
    const { couple } = await service.createCouple({ partnerA: "A", partnerB: "B", weddingDate: "2027-01-01T20:00" });
    await service.updatePublicInfo(couple.id, {
      venue: "Estancia La Linda",
      dressCode: "Elegante sport",
      schedule: [{ time: "19:00", title: "Ceremonia" }],
    });

    const page = await service.getPublicPage(couple.slug);
    expect(page?.publicInfo.venue).toBe("Estancia La Linda");
    expect(page?.publicInfo.schedule).toEqual([{ time: "19:00", title: "Ceremonia" }]);
    expect(page).not.toHaveProperty("accessCodeHash");
  });

  it("publishes proposals that the couple can answer", async () => {
    const { couple } = await service.createCouple({ partnerA: "A", partnerB: "B", weddingDate: "2027-01-01T20:00" });
    const proposal = await service.addProposal(couple.id, { title: "Ambientación", description: "Luces cálidas" });
    expect(proposal.status).toBe("pending");

    await service.respondToProposal(couple.id, proposal.id, "approved", "¡Nos encanta!");
    const updated = (await service.getCouple(couple.id))?.proposals[0];
    expect(updated).toMatchObject({ status: "approved", coupleComment: "¡Nos encanta!" });
  });

  it("publishes reports newest first", async () => {
    const { couple } = await service.createCouple({ partnerA: "A", partnerB: "B", weddingDate: "2027-01-01T20:00" });
    await service.addReport(couple.id, { title: "Reporte 1", body: "Primero" });
    await service.addReport(couple.id, { title: "Reporte 2", body: "Segundo" });

    const reports = (await service.getCouple(couple.id))?.reports ?? [];
    expect(reports.map((r) => r.title)).toEqual(["Reporte 2", "Reporte 1"]);
  });

  it("toggles checklist tasks", async () => {
    const { couple } = await service.createCouple({ partnerA: "A", partnerB: "B", weddingDate: "2027-01-01T20:00" });
    const task = await service.addTask(couple.id, "Elegir vestido");
    await service.toggleTask(couple.id, task.id);
    expect((await service.getCouple(couple.id))?.tasks[0].done).toBe(true);
  });
});
