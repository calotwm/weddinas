import { describe, expect, it } from "vitest";
import { monthTopicsMessage, normalizeWhatsapp, proposalMessage, reminderDue, reminderMessage, whatsappLink } from "./whatsapp";

describe("normalizeWhatsapp", () => {
  it("keeps digits and adds Argentina's mobile prefix to local numbers", () => {
    expect(normalizeWhatsapp("+54 9 11 2233-4455")).toBe("5491122334455");
    expect(normalizeWhatsapp("11 2233 4455")).toBe("5491122334455");
    expect(normalizeWhatsapp("011 2233 4455")).toBe("5491122334455");
    expect(normalizeWhatsapp("+54 11 2233 4455")).toBe("5491122334455");
    expect(normalizeWhatsapp("+34 612 345 678")).toBe("34612345678");
  });

  it("clears with an empty value and rejects numbers that cannot be WhatsApp numbers", () => {
    expect(normalizeWhatsapp("  ")).toBe("");
    expect(() => normalizeWhatsapp("1234")).toThrow();
    expect(() => normalizeWhatsapp("1234567890123456")).toThrow();
  });
});

describe("whatsappLink", () => {
  it("opens the couple's chat with the message written", () => {
    expect(whatsappLink("5491122334455", "Hola & chau")).toBe("https://wa.me/5491122334455?text=Hola%20%26%20chau");
  });

  it("lets the team pick the chat when there is no number", () => {
    expect(whatsappLink("", "Hola")).toBe("https://wa.me/?text=Hola");
    expect(whatsappLink(undefined, "Hola")).toBe("https://wa.me/?text=Hola");
  });
});

describe("messages", () => {
  const link = "https://portal.weddinas.com/portal/propuestas";

  it("announces a new proposal and reminds about it", () => {
    expect(proposalMessage("Delfi & Juancho", "DJ: Tommy Muñoz", link)).toBe(
      `¡Hola Delfi & Juancho! Les dejamos una nueva propuesta en el portal: "DJ: Tommy Muñoz". La pueden ver acá: ${link}`,
    );
    expect(reminderMessage("Delfi & Juancho", "DJ: Tommy Muñoz", link)).toBe(
      `¡Hola Delfi & Juancho! Les recordamos que tienen para ver la propuesta "DJ: Tommy Muñoz". Cuando puedan, nos cuentan qué les pareció: ${link}`,
    );
  });

  it("lists this month's topics with the ones still open from past months", () => {
    expect(monthTopicsMessage("Delfi & Juancho", "noviembre 2026", ["Elegir fotógrafo", "Prueba de vestido"], ["Mandar lista de invitados"], link)).toBe(
      [
        "¡Hola Delfi & Juancho! Estos son los temas de noviembre 2026:",
        "• Elegir fotógrafo",
        "• Prueba de vestido",
        "",
        "Pendientes de meses anteriores:",
        "• Mandar lista de invitados",
        "",
        `Los ven en el portal: ${link}`,
      ].join("\n"),
    );
    expect(monthTopicsMessage("Ana & Beto", "enero 2027", ["Degustación"], [], link)).toBe(
      ["¡Hola Ana & Beto! Estos son los temas de enero 2027:", "• Degustación", "", `Los ven en el portal: ${link}`].join("\n"),
    );
  });
});

describe("reminderDue", () => {
  // Presented Monday 10 Nov 2026, 15:00 in Buenos Aires (18:00 UTC): reminder on Wednesday 12 Nov at 19:00 (22:00 UTC).
  const presented = "2026-11-10T18:00:00.000Z";

  it("is due from 19:00 Buenos Aires time of the second day after presenting", () => {
    expect(reminderDue(presented, new Date("2026-11-12T21:59:00.000Z"))).toBe(false);
    expect(reminderDue(presented, new Date("2026-11-12T22:00:00.000Z"))).toBe(true);
  });

  it("counts days in Buenos Aires, not UTC", () => {
    // 23:30 on 10 Nov in Buenos Aires is already 11 Nov in UTC; the reminder still goes on 12 Nov.
    expect(reminderDue("2026-11-11T02:30:00.000Z", new Date("2026-11-12T22:00:00.000Z"))).toBe(true);
  });
});
