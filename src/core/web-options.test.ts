import { describe, expect, it } from "vitest";
import {
  MAX_WEB_CUSTOM,
  WEB_ITEMS,
  WEB_SAMPLES,
  cleanWebSelection,
  formatWebDate,
  readWebForm,
  webDressCode,
} from "./web-options";

const item = (id: string) => WEB_ITEMS.find((i) => i.id === id)!;
const labels = (id: string) => item(id).choices.map((c) => c.label);

describe("web options catalog", () => {
  it("lists the four sample webs with their links", () => {
    expect(WEB_SAMPLES).toEqual([
      { option: 1, label: "Opción 1", url: "https://invitaciones.weddinas.com/clariymati/" },
      { option: 2, label: "Opción 2", url: "https://invitaciones.weddinas.com/luygaston/" },
      { option: 3, label: "Opción 3", url: "https://invitaciones.weddinas.com/evelynygabrieles/" },
      { option: 4, label: "Opción 4", url: "https://invitaciones.weddinas.com/anitayfran/" },
    ]);
  });

  it("offers exactly the agency's choices for every item", () => {
    expect(WEB_ITEMS.map((i) => i.label)).toEqual([
      "Bienvenida",
      "Nombres",
      "Fecha",
      "Frase para la web",
      "Código de vestimenta",
      "Frase regalos",
      "Regalos",
      "Instagram",
      "Canciones",
      "Mensaje a novios",
    ]);
    expect(labels("welcome")).toEqual(["Nuestra boda", "Nuestro casamiento", "Bienvenidos", "Nos casamos", "Nada", "Otra opción (escribirla)"]);
    expect(labels("names")).toEqual(["Apodo y Apodo", "Nombre y Nombre", "Nombre y apellido y Nombre y apellido", "Otra opción (Escribirla)"]);
    expect(labels("date")).toEqual(["XX.XX.XX", "XX/XX/XX", "XX|XX|XX", "XX-XX-XX"]);
    expect(labels("phrase")).toEqual(["Escribir una frase que quieran", "Nada"]);
    expect(labels("dressCode")).toEqual(["Formal", "Informal", "Elegante", "Elegante sport", "Otra opción"]);
    expect(item("dressCode").choices.at(-1)!.hint).toBe("Acá se puede profundizar en colores a utilizar, blanco exclusivo novia, recomendación de calzado");
    expect(labels("giftPhrase")).toEqual(["Queres hacernos un regalo?", "Nos ayudas con la luna de miel?", "Otra opción (Escribirla)"]);
    expect(labels("gifts")).toEqual(["Cuenta en $ y dólares + Sobre el día del evento", "Cuenta en $", "Cuenta en dólares", "Nada", "Otra opción (escribirla)"]);
    expect(item("gifts").hint).toBe("Aclarar cuentas, recomendamos cambiar el alias para que quede algo relacionado a la boda");
    expect(labels("instagram")).toEqual(["Cuenta de la boda", "Hashtag", "Nada", "Otra opción (Escribirla)"]);
    expect(labels("songs")).toEqual(["Poner link spotify", "Agregarlo en la parte de confirmación", "Nada", "Otra opción (Escribirla)"]);
    expect(labels("message")).toEqual(["Agregarlo en la parte de confirmación", "Nada", "Otra opción (Escribirla)"]);
  });

  it("asks for custom text only on the write-your-own choices; the date has none", () => {
    const custom = WEB_ITEMS.flatMap((i) => i.choices.filter((c) => c.custom).map((c) => `${i.id}:${c.label}`));
    expect(custom).toEqual([
      "welcome:Otra opción (escribirla)",
      "names:Otra opción (Escribirla)",
      "phrase:Escribir una frase que quieran",
      "dressCode:Otra opción",
      "giftPhrase:Otra opción (Escribirla)",
      "gifts:Otra opción (escribirla)",
      "instagram:Otra opción (Escribirla)",
      "songs:Otra opción (Escribirla)",
      "message:Otra opción (Escribirla)",
    ]);
  });

  it("formats the wedding date with each date choice", () => {
    expect(formatWebDate("2027-02-08T18:00", "dots")).toBe("08.02.27");
    expect(formatWebDate("2027-02-08T18:00", "slashes")).toBe("08/02/27");
    expect(formatWebDate("2027-02-08T18:00", "pipes")).toBe("08|02|27");
    expect(formatWebDate("2027-02-08T18:00", "dashes")).toBe("08-02-27");
    expect(formatWebDate("", "dots")).toBeNull();
    expect(formatWebDate("2027-02-08", "nope")).toBeNull();
  });
});

describe("cleanWebSelection", () => {
  it("keeps valid choices, trims and limits custom text and drops it on preset choices", () => {
    const clean = cleanWebSelection({
      option: 3,
      choices: {
        welcome: { choice: "other", custom: "  Bienvenidos a nuestra fiesta  " },
        date: { choice: "dots", custom: "ignored" },
        phrase: { choice: "write", custom: "x".repeat(MAX_WEB_CUSTOM + 50) },
        names: { choice: "", custom: "" },
      },
    });
    expect(clean).toEqual({
      option: 3,
      choices: {
        welcome: { choice: "other", custom: "Bienvenidos a nuestra fiesta" },
        date: { choice: "dots", custom: "" },
        phrase: { choice: "write", custom: "x".repeat(MAX_WEB_CUSTOM) },
      },
    });
  });

  it("rejects a choice that belongs to another item, an unknown item or an unknown sample", () => {
    expect(() => cleanWebSelection({ option: null, choices: { date: { choice: "other", custom: "" } } })).toThrow("web choice");
    expect(() => cleanWebSelection({ option: null, choices: { nope: { choice: "none", custom: "" } } })).toThrow("web choice");
    expect(() => cleanWebSelection({ option: 5, choices: {} })).toThrow("web option");
    expect(() => cleanWebSelection({ option: 1.5, choices: {} })).toThrow("web option");
  });

  it("derives the guest-page dress code: the label for presets, the custom text for the other choice", () => {
    expect(webDressCode({ option: null, choices: { dressCode: { choice: "smartCasual", custom: "" } } })).toBe("Elegante sport");
    expect(webDressCode({ option: null, choices: { dressCode: { choice: "other", custom: "Blanco solo la novia" } } })).toBe("Blanco solo la novia");
    expect(webDressCode({ option: null, choices: {} })).toBeNull();
  });
});

describe("readWebForm", () => {
  it("reads the sample and every item's choice and custom text from the form", () => {
    const form = new FormData();
    form.set("webOption", "2");
    form.set("web-welcome", "other");
    form.set("web-welcome-custom", "Hola");
    form.set("web-date", "pipes");
    expect(readWebForm(form)).toEqual({
      option: 2,
      choices: {
        welcome: { choice: "other", custom: "Hola" },
        date: { choice: "pipes", custom: "" },
      },
    });
    expect(readWebForm(new FormData())).toEqual({ option: null, choices: {} });
  });
});
