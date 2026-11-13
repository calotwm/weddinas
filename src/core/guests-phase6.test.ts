import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";
import { guestInput } from "@/components/planner/section-forms";
import type { Guest } from "./couple";
import { guestFormKey } from "./guests";
import { PortalService } from "./portal-service";

// section-forms is server code that wires the real container; the parser under test needs neither.
vi.mock("server-only", () => ({}));
vi.mock("@/server/container", () => ({ portal: {}, files: {} }));

/** What the guest row form posts: every column it shows, never "travels" (the row has no input for it). */
const rowForm = (fields: Record<string, string>) => {
  const form = new FormData();
  const all = { name: "Ana", lastName: "Pérez", group: "Familia", status: "pending", table: "3", restriction: "", age: "adult", side: "", transport: "", phone: "", ...fields };
  for (const [key, value] of Object.entries(all)) form.set(key, value);
  return form;
};

describe("guest edits from the row form", () => {
  let dir: string;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-"));
    service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
    ({ couple: { id: coupleId } } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" }));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const stored = async () => (await service.getCouple(coupleId))!.guests[0];

  it("saves the status picked in the row and keeps it on the next save", async () => {
    const [ana] = await service.addGuests(coupleId, [{ name: "Ana", status: "pending" }]);
    await service.updateGuest(coupleId, ana.id, guestInput(rowForm({ status: "confirmed" })));
    expect((await stored()).status).toBe("confirmed");
    await service.updateGuest(coupleId, ana.id, guestInput(rowForm({ status: "confirmed", table: "4" })));
    expect(await stored()).toMatchObject({ status: "confirmed", table: "4" });
  });

  it("keeps the stored fields the row form does not carry (travels, arrived)", async () => {
    const [ana] = await service.addGuests(coupleId, [{ name: "Ana", travels: true }]);
    await service.setGuestArrived(coupleId, ana.id, true);
    await service.updateGuest(coupleId, ana.id, guestInput(rowForm({ status: "confirmed" })));
    expect(await stored()).toMatchObject({ status: "confirmed", travels: true, arrived: true });
  });

  it("still lets an explicit travels answer replace the stored one", async () => {
    const [ana] = await service.addGuests(coupleId, [{ name: "Ana", travels: true }]);
    const form = rowForm({});
    form.set("travels", "no");
    await service.updateGuest(coupleId, ana.id, guestInput(form));
    expect((await stored()).travels).toBe(false);
  });
});

describe("guest attendance (team only)", () => {
  let dir: string;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-"));
    service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
    ({ couple: { id: coupleId } } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" }));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const guests = async () => (await service.getCouple(coupleId))!.guests;

  it("ticks and unticks a guest's arrival", async () => {
    const [ana, juan] = await service.addGuests(coupleId, [{ name: "Ana" }, { name: "Juan" }]);
    await service.setGuestArrived(coupleId, ana.id, true);
    expect((await guests()).map((g) => [g.name, g.arrived])).toEqual([
      ["Ana", true],
      ["Juan", undefined],
    ]);
    await service.setGuestArrived(coupleId, ana.id, false);
    expect((await guests())[0]).not.toHaveProperty("arrived");
    await expect(service.setGuestArrived(coupleId, "nope", true)).rejects.toThrow("Guest not found");
    expect(juan.arrived).toBeUndefined();
  });

  it("is not set through the guest add and edit paths the couple uses", async () => {
    const [ana] = await service.addGuests(coupleId, [{ name: "Ana", arrived: true }]);
    expect((await guests())[0]).not.toHaveProperty("arrived");
    await service.updateGuest(coupleId, ana.id, { name: "Ana", group: "", status: "confirmed", table: "", restriction: "", arrived: true });
    expect((await guests())[0]).not.toHaveProperty("arrived");
  });
});

describe("guestFormKey", () => {
  const guest = (over: Partial<Guest>): Guest => ({ id: "g1", name: "Ana", group: "", status: "pending", table: "", restriction: "", ...over });

  it("changes when a saved value changes, so the row form remounts with it", () => {
    expect(guestFormKey(guest({ status: "confirmed" }))).not.toBe(guestFormKey(guest({ status: "pending" })));
    expect(guestFormKey(guest({ age: "child" }))).not.toBe(guestFormKey(guest({})));
    expect(guestFormKey(guest({}))).toBe(guestFormKey(guest({})));
  });
});
