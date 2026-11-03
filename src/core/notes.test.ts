import { describe, expect, it } from "vitest";
import { noteLines } from "./notes";

describe("noteLines", () => {
  it("turns each line into an item, dropping the dash people type", () => {
    expect(noteLines("- Luces de navidad\nAlmohadones en tonos neutros")).toEqual([
      { kind: "item", text: "Luces de navidad" },
      { kind: "item", text: "Almohadones en tonos neutros" },
    ]);
  });

  it("treats a line ending in a colon, or followed by dashed lines, as a heading", () => {
    expect(noteLines("Iluminacion:\n- Luces de kermesse\nMobiliario externo\n- 4 living de madera\n\n")).toEqual([
      { kind: "heading", text: "Iluminacion" },
      { kind: "item", text: "Luces de kermesse" },
      { kind: "heading", text: "Mobiliario externo" },
      { kind: "item", text: "4 living de madera" },
    ]);
  });

  it("keeps a single line as one item", () => {
    expect(noteLines("  30%  ")).toEqual([{ kind: "item", text: "30%" }]);
    expect(noteLines("")).toEqual([]);
  });
});
