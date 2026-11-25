import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";
import { guestInput } from "@/components/planner/section-forms";
import { GUEST_SHEET_COLUMNS, guestSheet } from "@/components/print/guest-sheet";
import type { Guest } from "./couple";
import { arrivalCounts, filterGuests, MAX_GUEST_NOTES, MISSING_FIELD_LABEL, splitFullName } from "./guests";
import { PortalService } from "./portal-service";
import type { RsvpAnswer } from "./rsvp";

// section-forms is server code that wires the real container; the parser under test needs neither.
vi.mock("server-only", () => ({}));
vi.mock("@/server/container", () => ({ portal: {}, files: {} }));

const guest = (over: Partial<Guest>): Guest => ({ id: over.name ?? "x", name: "", group: "", status: "pending", table: "", restriction: "", ...over });

describe("S14 guest filters", () => {
  const list = [
    guest({ name: "Ana", lastName: "Pérez", table: "3", restriction: "Celíaco", transport: "Combi 1", phone: "11 5555", age: "adult", status: "confirmed" }),
    guest({ name: "Juan", lastName: "Gómez", table: "", restriction: "", age: "child", group: "Amigos", side: "Novia" }),
    guest({ name: "Luz", lastName: "Díaz", table: "3", notes: "Llega tarde, va en silla de ruedas" }),
  ];
  const names = (guests: Guest[]) => guests.map((g) => g.name);

  it("labels each empty-value filter as the client asked", () => {
    expect(Object.values(MISSING_FIELD_LABEL)).toEqual(["Sin mesa", "Sin menú", "Sin combi", "Sin teléfono", "Sin edad"]);
  });

  it("keeps everybody with no filter", () => {
    expect(names(filterGuests(list, {}))).toEqual(["Ana", "Juan", "Luz"]);
  });

  it("filters guests without a table, menu, combi, phone or age", () => {
    expect(names(filterGuests(list, { missing: ["table"] }))).toEqual(["Juan"]);
    expect(names(filterGuests(list, { missing: ["restriction"] }))).toEqual(["Juan", "Luz"]);
    expect(names(filterGuests(list, { missing: ["transport"] }))).toEqual(["Juan", "Luz"]);
    expect(names(filterGuests(list, { missing: ["phone"] }))).toEqual(["Juan", "Luz"]);
    expect(names(filterGuests(list, { missing: ["age"] }))).toEqual(["Luz"]);
  });

  it("treats a blank value as missing", () => {
    expect(names(filterGuests([guest({ name: "Eva", table: "  ", phone: " " })], { missing: ["table", "phone"] }))).toEqual(["Eva"]);
  });

  it("combines the empty-value filters with each other and with status and table", () => {
    expect(names(filterGuests(list, { missing: ["restriction", "transport"] }))).toEqual(["Juan", "Luz"]);
    expect(names(filterGuests(list, { missing: ["restriction"], table: "3" }))).toEqual(["Luz"]);
    expect(names(filterGuests(list, { missing: ["age"], status: "confirmed" }))).toEqual([]);
    expect(names(filterGuests(list, { status: "pending" }))).toEqual(["Juan", "Luz"]);
  });

  it("searches every text field, ignoring case and accents", () => {
    expect(names(filterGuests(list, { query: "perez" }))).toEqual(["Ana"]);
    expect(names(filterGuests(list, { query: "CELIACO" }))).toEqual(["Ana"]);
    expect(names(filterGuests(list, { query: "combi 1" }))).toEqual(["Ana"]);
    expect(names(filterGuests(list, { query: "5555" }))).toEqual(["Ana"]);
    expect(names(filterGuests(list, { query: "amigos" }))).toEqual(["Juan"]);
    expect(names(filterGuests(list, { query: "novia" }))).toEqual(["Juan"]);
    expect(names(filterGuests(list, { query: "niño" }))).toEqual(["Juan"]);
    expect(names(filterGuests(list, { query: "silla" }))).toEqual(["Luz"]);
    expect(names(filterGuests(list, { query: "confirmado" }))).toEqual(["Ana"]);
    expect(names(filterGuests(list, { query: "  " }))).toEqual(["Ana", "Juan", "Luz"]);
    expect(names(filterGuests(list, { query: "luz diaz", missing: ["restriction"] }))).toEqual(["Luz"]);
  });
});

describe("S17 attendance counts", () => {
  it("counts who arrived and the confirmed guests still missing", () => {
    const counts = arrivalCounts([
      guest({ name: "A", status: "confirmed", arrived: true }),
      guest({ name: "B", status: "confirmed" }),
      guest({ name: "C", status: "confirmed" }),
      guest({ name: "D", status: "pending", arrived: true }),
      guest({ name: "E", status: "declined" }),
    ]);
    expect(counts).toEqual({ arrived: 2, missing: 2 });
  });

  it("is zero for an empty list", () => {
    expect(arrivalCounts([])).toEqual({ arrived: 0, missing: 0 });
  });
});

describe("S18 send-list export", () => {
  it("has the columns Apellido, Nombre, Edad, Mesa, Menú in that order", () => {
    expect(GUEST_SHEET_COLUMNS.map((c) => c.label)).toEqual(["Apellido", "Nombre", "Edad", "Mesa", "Menú"]);
  });

  it("fills each row in the team list order with those values", () => {
    const { rows } = guestSheet([
      guest({ name: "Zoe", lastName: "Pérez", table: "3", restriction: "Celíaco", age: "child", status: "confirmed", arrived: true }),
      guest({ name: "Ana", lastName: "Álvarez", table: "1" }),
    ]);
    expect(rows.map((r) => GUEST_SHEET_COLUMNS.map((c) => r[c.key]))).toEqual([
      ["Álvarez", "Ana", "", "1", ""],
      ["Pérez", "Zoe", "Niño", "3", "Celíaco"],
    ]);
  });
});

describe("S19 split of a full name from the invitation web", () => {
  it("takes the last word as the last name", () => {
    expect(splitFullName("  Ana  María Pérez ")).toEqual({ name: "Ana María", lastName: "Pérez" });
    expect(splitFullName("Bruno")).toEqual({ name: "Bruno", lastName: "" });
  });
});

describe("guest service (phase 8)", () => {
  let dir: string;
  let file: string;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-"));
    file = path.join(dir, "db.json");
    service = new PortalService(new JsonCoupleRepository(file));
    ({ couple: { id: coupleId } } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" }));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  /** A fresh service on the same file, so the check reads what was persisted. */
  const reloaded = async () => (await new PortalService(new JsonCoupleRepository(file)).getCouple(coupleId))!.guests;

  describe("S15 notes", () => {
    const form = (notes: string) => {
      const data = new FormData();
      for (const [k, v] of Object.entries({ name: "Ana", lastName: "Pérez", status: "pending", table: "", restriction: "", notes })) data.set(k, v);
      return data;
    };

    it("reads notes from the row form, trimmed and capped", () => {
      expect(guestInput(form("  Llega tarde  ")).notes).toBe("Llega tarde");
      expect(guestInput(form("x".repeat(MAX_GUEST_NOTES + 50))).notes).toHaveLength(MAX_GUEST_NOTES);
    });

    it("stores notes on add and on update, and clears them when emptied", async () => {
      const [ana] = await service.addGuests(coupleId, [{ name: "Ana", notes: "  Vegana estricta " }]);
      expect((await reloaded())[0].notes).toBe("Vegana estricta");
      await service.updateGuest(coupleId, ana.id, guestInput(form("Silla alta")));
      expect((await reloaded())[0].notes).toBe("Silla alta");
      await service.updateGuest(coupleId, ana.id, guestInput(form("   ")));
      expect((await reloaded())[0]).not.toHaveProperty("notes");
    });

    it("caps notes stored through the service", async () => {
      await service.addGuests(coupleId, [{ name: "Ana", notes: "y".repeat(MAX_GUEST_NOTES + 1) }]);
      expect((await reloaded())[0].notes).toHaveLength(MAX_GUEST_NOTES);
    });
  });

  describe("S17 arrival tick", () => {
    it("persists both ticking and unticking", async () => {
      const [ana] = await service.addGuests(coupleId, [{ name: "Ana", status: "confirmed" }]);
      await service.setGuestArrived(coupleId, ana.id, true);
      expect((await reloaded())[0].arrived).toBe(true);
      expect(arrivalCounts(await reloaded())).toEqual({ arrived: 1, missing: 0 });
      await service.setGuestArrived(coupleId, ana.id, false);
      expect((await reloaded())[0]).not.toHaveProperty("arrived");
      expect(arrivalCounts(await reloaded())).toEqual({ arrived: 0, missing: 1 });
    });
  });

  describe("S19 RSVP for someone not on the list", () => {
    const answer = (name: string, extra: Partial<RsvpAnswer> = {}): RsvpAnswer => ({ name, attending: true, menu: "", song: "", message: "", ...extra });

    it("adds the guest with the answer's name, attendance and menu, and logs it as applied", async () => {
      const token = await service.rsvpToken(coupleId);
      expect(await service.receiveRsvp(coupleId, token, answer("Sofía Ruiz", { menu: "Vegetariano" }))).toBe("created");
      expect(await service.receiveRsvp(coupleId, token, answer("Tomás", { attending: false }))).toBe("created");

      const couple = (await service.getCouple(coupleId))!;
      expect(couple.guests.map((g) => [g.name, g.lastName, g.status, g.restriction])).toEqual([
        ["Sofía", "Ruiz", "confirmed", "Vegetariano"],
        ["Tomás", undefined, "declined", ""],
      ]);
      expect(couple.rsvpInbox.map((e) => e.guestId)).toEqual(couple.guests.map((g) => g.id));
    });

    it("does not duplicate the guest when the same person answers again", async () => {
      const token = await service.rsvpToken(coupleId);
      await service.receiveRsvp(coupleId, token, answer("Sofía Ruiz", { attending: null }));
      expect(await service.receiveRsvp(coupleId, token, answer("sofia ruiz", { menu: "Celíaco" }))).toBe("matched");
      const couple = (await service.getCouple(coupleId))!;
      expect(couple.guests).toHaveLength(1);
      expect(couple.guests[0]).toMatchObject({ name: "Sofía", lastName: "Ruiz", status: "confirmed", restriction: "Celíaco" });
      expect(couple.rsvpInbox).toHaveLength(2);
    });

    it("leaves an answer that names several guests for manual assignment", async () => {
      await service.addGuests(coupleId, [
        { name: "Juan", lastName: "Gómez" },
        { name: "Juan", lastName: "Gómez", group: "Amigos" },
      ]);
      const token = await service.rsvpToken(coupleId);
      expect(await service.receiveRsvp(coupleId, token, answer("Juan Gómez"))).toBe("unmatched");
      const couple = (await service.getCouple(coupleId))!;
      expect(couple.guests).toHaveLength(2);
      expect(couple.rsvpInbox[0].guestId).toBeNull();
    });

    it("keeps the answer for manual assignment when the list is full", async () => {
      await service.addGuests(coupleId, Array.from({ length: 1000 }, (_, i) => ({ name: `G${i}` })));
      const token = await service.rsvpToken(coupleId);
      expect(await service.receiveRsvp(coupleId, token, answer("Sofía Ruiz"))).toBe("unmatched");
      expect((await service.getCouple(coupleId))!.guests).toHaveLength(1000);
    });
  });
});
