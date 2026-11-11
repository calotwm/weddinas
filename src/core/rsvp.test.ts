import { describe, expect, it } from "vitest";
import { matchGuest, parseRsvp, rsvpBodyEntries } from "./rsvp";

describe("parseRsvp", () => {
  it("reads the simple Elementor webhook, keyed by label or by field id when the field has no label", () => {
    expect(
      parseRsvp([
        ["name", " Ana  Pérez "],
        ["field_a76158b", "Sí, ahí estaré!"],
        ["Tipo de menú", "Celíaco"],
        ["Que canción no puede faltar?", "Mr. Brightside"],
        ["Mensaje para los novios:", "¡Felicidades!"],
        ["Date", "11/11/2026"],
        ["Page URL", "https://invitaciones.weddinas.com/anitayfran/"],
        ["Powered by", "Elementor"],
      ]),
    ).toEqual({ name: "Ana Pérez", attending: true, menu: "Celíaco", song: "Mr. Brightside", message: "¡Felicidades!" });
  });

  it("reads the advanced webhook (fields[id][title|value])", () => {
    expect(
      parseRsvp([
        ["form[name]", "Form invitación asistencia"],
        ["fields[name][id]", "name"],
        ["fields[name][title]", ""],
        ["fields[name][value]", "Juan Gómez"],
        ["fields[field_a76158b][title]", ""],
        ["fields[field_a76158b][value]", "No podré asistir"],
        ["fields[field_877274d][title]", "Tipo de menú"],
        ["fields[field_877274d][value]", "Vegano"],
        ["meta[remote_ip][value]", "10.0.0.1"],
      ]),
    ).toEqual({ name: "Juan Gómez", attending: false, menu: "Vegano", song: "", message: "" });
  });

  it("treats the menu choice \"No asistiré\" as declining, and unknown attendance as null", () => {
    expect(parseRsvp([["Nombre y apellido", "Ana"], ["Tipo de menú", "No asistiré"]])).toMatchObject({ attending: false, menu: "" });
    expect(parseRsvp([["Nombre y apellido", "Ana"], ["Tipo de menú", "Vegetariano"]])).toMatchObject({ attending: null, menu: "Vegetariano" });
  });

  it("caps long texts and returns null without a name", () => {
    expect(parseRsvp([["Tipo de menú", "Vegano"]])).toBeNull();
    expect(parseRsvp([["name", "  "]])).toBeNull();
    const long = parseRsvp([["name", "A".repeat(500)], ["Mensaje para los novios:", "x".repeat(5000)]])!;
    expect(long.name).toHaveLength(160);
    expect(long.message).toHaveLength(1000);
  });
});

describe("matchGuest", () => {
  const guests = [
    { id: "1", name: "Ana", lastName: "Pérez" },
    { id: "2", name: "Juan Martín", lastName: "Gómez" },
    { id: "3", name: "Luz", lastName: "Díaz" },
    { id: "4", name: "Luz", lastName: "Díaz" },
    { id: "5", name: "Pedro" },
  ];

  it("matches name + last name in either order, ignoring case, accents and extra spaces", () => {
    expect(matchGuest(guests, "ana perez")?.id).toBe("1");
    expect(matchGuest(guests, "PÉREZ,  Ana")?.id).toBe("1");
    expect(matchGuest(guests, "Juan Martín Gómez")?.id).toBe("2");
    expect(matchGuest(guests, "pedro")?.id).toBe("5");
  });

  it("does not guess: no match or several matches return null", () => {
    expect(matchGuest(guests, "Juancho")).toBeNull();
    expect(matchGuest(guests, "Ana")).toBeNull();
    expect(matchGuest(guests, "Luz Díaz")).toBeNull();
  });
});

describe("rsvpBodyEntries", () => {
  it("reads form-urlencoded bodies, as Elementor sends them", () => {
    expect(rsvpBodyEntries("name=Ana+P%C3%A9rez&Tipo+de+men%C3%BA=Vegano", "application/x-www-form-urlencoded; charset=UTF-8")).toEqual([
      ["name", "Ana Pérez"],
      ["Tipo de menú", "Vegano"],
    ]);
  });

  it("flattens JSON bodies into the same bracket keys", () => {
    expect(rsvpBodyEntries(JSON.stringify({ fields: { name: { title: "", value: "Ana" } }, form: { id: "x" } }), "application/json")).toEqual([
      ["fields[name][title]", ""],
      ["fields[name][value]", "Ana"],
      ["form[id]", "x"],
    ]);
  });

  it("returns nothing for other or broken bodies", () => {
    expect(rsvpBodyEntries("{oops", "application/json")).toEqual([]);
    expect(rsvpBodyEntries("name=Ana", "text/plain")).toEqual([]);
  });
});
