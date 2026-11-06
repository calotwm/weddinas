import { describe, expect, it } from "vitest";
import { DEFAULT_WELCOME_TEMPLATE, renderWelcomeMessage } from "./welcome-message";

const values = { nombres: "Delfi & Juancho", link: "https://portal.weddinas.com", codigo: "DELFIYJUANCHO27" };

describe("renderWelcomeMessage", () => {
  it("replaces every placeholder, including repeated ones", () => {
    expect(renderWelcomeMessage("Hola {nombres}! {link} · {codigo} · {nombres}", values)).toBe(
      "Hola Delfi & Juancho! https://portal.weddinas.com · DELFIYJUANCHO27 · Delfi & Juancho",
    );
  });

  it("keeps values literally, even with replacement patterns like $&", () => {
    expect(renderWelcomeMessage("Código: {codigo}", { ...values, codigo: "A$&B$1" })).toBe("Código: A$&B$1");
  });

  it("leaves unknown braces untouched", () => {
    expect(renderWelcomeMessage("{otro} {codigo}", values)).toBe("{otro} DELFIYJUANCHO27");
  });

  it("falls back to the default text when the template is blank", () => {
    expect(renderWelcomeMessage("   ", values)).toBe(renderWelcomeMessage(DEFAULT_WELCOME_TEMPLATE, values));
  });

  it("renders the default text exactly as the message the team sent before", () => {
    expect(renderWelcomeMessage(DEFAULT_WELCOME_TEMPLATE, values)).toBe(
      "¡Hola Delfi & Juancho! Este es su portal Weddinas, donde van a ver la cuenta regresiva, propuestas, proveedores y pagos, y armar su página.\n\nEntren en https://portal.weddinas.com con el código: DELFIYJUANCHO27",
    );
  });
});
