import { describe, expect, it } from "vitest";
import { briefSearchText, matchesBriefSearch } from "./brief-search";
import type { BriefBlock } from "./couple";

const block: BriefBlock = {
  key: "catering",
  name: "Catering",
  kind: "vendor",
  vendor: "Softies",
  contact: "Juli 11 5555",
  status: "confirmed",
  owner: "Nat",
  fields: [
    { label: "Menú celíaco", detail: "Dos platos sin TACC", note: "Confirmar con el salón" },
    { label: "Equipo", detail: "10% comisión", note: "" },
  ],
};

describe("brief search", () => {
  it("finds a rubro by its title, vendor, owner, row names, details and notes, ignoring case and accents", () => {
    const text = briefSearchText(block);
    for (const q of ["catering", "SOFTIES", "nat", "menu celiaco", "tacc", "salon", "comision"]) expect(matchesBriefSearch(text, q)).toBe(true);
  });

  it("needs every word to match, and an empty search shows everything", () => {
    const text = briefSearchText(block);
    expect(matchesBriefSearch(text, "celiaco softies")).toBe(true);
    expect(matchesBriefSearch(text, "celiaco barra")).toBe(false);
    expect(matchesBriefSearch(text, "   ")).toBe(true);
  });
});
