import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PortalService } from "./portal-service";
import type { RsvpAnswer } from "./rsvp";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

const answer = (name: string, extra: Partial<RsvpAnswer> = {}): RsvpAnswer => ({ name, attending: true, menu: "", song: "", message: "", ...extra });

describe("RSVP answers from the invitation web", () => {
  let dir: string;
  let file: string;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-"));
    file = path.join(dir, "db.json");
    service = new PortalService(new JsonCoupleRepository(file));
    ({ couple: { id: coupleId } } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" }));
    await service.addGuests(coupleId, [
      { name: "Juan", lastName: "Gómez", restriction: "Vegano" },
      { name: "Luz", lastName: "Díaz" },
    ]);
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const load = async () => (await service.getCouple(coupleId))!;
  const raw = () => readFileSync(file, "utf8");

  it("creates one secret token per couple, stable until rotated, and keeps it out of the couple view", async () => {
    const token = await service.rsvpToken(coupleId);
    expect(token).toMatch(/^[0-9a-f]{48}$/);
    expect(await service.rsvpToken(coupleId)).toBe(token);
    expect(JSON.stringify(await load())).not.toContain(token);

    const rotated = await service.rotateRsvpToken(coupleId);
    expect(rotated).not.toBe(token);
    await expect(service.receiveRsvp(coupleId, token, answer("Juan Gómez"))).rejects.toThrow("token");
  });

  it("rejects a wrong or missing token without touching the data", async () => {
    await service.rsvpToken(coupleId);
    const before = raw();
    for (const bad of ["", "nope", "0".repeat(48)]) {
      await expect(service.receiveRsvp(coupleId, bad, answer("Juan Gómez"))).rejects.toThrow("token");
    }
    await expect(service.receiveRsvp("missing-couple", "x", answer("Juan Gómez"))).rejects.toThrow();
    expect(raw()).toBe(before);
  });

  it("never accepts answers before the team created a token", async () => {
    await expect(service.receiveRsvp(coupleId, "", answer("Juan Gómez"))).rejects.toThrow("token");
  });

  it("updates the matched guest's status and menu and logs the answer", async () => {
    const token = await service.rsvpToken(coupleId);
    expect(await service.receiveRsvp(coupleId, token, answer("juan gomez", { menu: "Celíaco", song: "Bailando", message: "¡Vivan!" }))).toBe("matched");
    expect(await service.receiveRsvp(coupleId, token, answer("Luz Díaz", { attending: false }))).toBe("matched");

    const couple = await load();
    expect(couple.guests.map((g) => [g.name, g.status, g.restriction])).toEqual([
      ["Juan", "confirmed", "Celíaco"],
      ["Luz", "declined", ""],
    ]);
    expect(couple.rsvpInbox.map((e) => [e.name, e.song, e.message, e.guestId === couple.guests[0].id])).toEqual([
      ["juan gomez", "Bailando", "¡Vivan!", true],
      ["Luz Díaz", "", "", false],
    ]);
  });

  it("clears the menu on \"Sin restricciones\" and keeps the status when attendance is unknown", async () => {
    const token = await service.rsvpToken(coupleId);
    await service.receiveRsvp(coupleId, token, answer("Juan Gómez", { attending: null, menu: "Sin restricciones" }));
    expect((await load()).guests[0]).toMatchObject({ status: "pending", restriction: "" });
  });

  it("keeps unmatched answers for manual assignment, then applies them to the chosen guest", async () => {
    const token = await service.rsvpToken(coupleId);
    expect(await service.receiveRsvp(coupleId, token, answer("Juancho", { menu: "Vegetariano" }))).toBe("unmatched");
    let couple = await load();
    const [entry] = couple.rsvpInbox;
    expect(entry.guestId).toBeNull();
    expect(couple.guests[0].status).toBe("pending");

    await service.assignRsvp(coupleId, entry.id, couple.guests[0].id);
    couple = await load();
    expect(couple.guests[0]).toMatchObject({ status: "confirmed", restriction: "Vegetariano" });
    expect(couple.rsvpInbox[0].guestId).toBe(couple.guests[0].id);

    await expect(service.assignRsvp(coupleId, entry.id, "missing")).rejects.toThrow("Guest not found");
    await expect(service.assignRsvp(coupleId, "missing", couple.guests[0].id)).rejects.toThrow("not found");

    await service.dismissRsvp(coupleId, entry.id);
    expect((await load()).rsvpInbox).toEqual([]);
  });

  it("keeps only the latest answers when the log is full", async () => {
    const token = await service.rsvpToken(coupleId);
    const stored = JSON.parse(raw());
    stored[0].rsvpInbox = Array.from({ length: 1000 }, (_, i) => ({ id: `e${i}`, receivedAt: "", ...answer(`Persona ${i}`), guestId: null }));
    writeFileSync(file, JSON.stringify(stored));
    for (let i = 1000; i < 1005; i++) await service.receiveRsvp(coupleId, token, answer(`Persona ${i}`));
    const inbox = (await load()).rsvpInbox;
    expect(inbox).toHaveLength(1000);
    expect(inbox[0].name).toBe("Persona 5");
  });
});
