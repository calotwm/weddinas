import { describe, expect, it } from "vitest";
import { normalizeAlias, normalizeCbu } from "./gift";
import { mapEmbedUrl } from "./url";

describe("normalizeCbu", () => {
  it("keeps a 22-digit CBU or CVU, ignoring spaces and dashes", () => {
    expect(normalizeCbu("0000003 1000 12345678-901")).toBe("0000003100012345678901");
  });

  it("drops anything that is not 22 digits", () => {
    expect(normalizeCbu("123")).toBe("");
    expect(normalizeCbu("00000031000123456789012")).toBe("");
    expect(normalizeCbu("SOFI.MARTIN")).toBe("");
  });
});

describe("normalizeAlias", () => {
  it("keeps a bank alias of 6 to 20 letters, digits, dots or dashes", () => {
    expect(normalizeAlias("  Sofi.Martin.Boda ")).toBe("sofi.martin.boda");
    expect(normalizeAlias("luna-de-miel")).toBe("luna-de-miel");
  });

  it("drops anything else", () => {
    expect(normalizeAlias("abc")).toBe("");
    expect(normalizeAlias("un alias con espacios")).toBe("");
    expect(normalizeAlias("<script>alert</script>")).toBe("");
  });
});

describe("mapEmbedUrl", () => {
  it("embeds Google Maps searching the address, or the venue when there is none", () => {
    expect(mapEmbedUrl({ venue: "Darwin Tortugas", venueAddress: "Panamericana km 40, Pilar" })).toBe(
      "https://www.google.com/maps?q=Darwin%20Tortugas%2C%20Panamericana%20km%2040%2C%20Pilar&output=embed",
    );
    expect(mapEmbedUrl({ venue: "Darwin Tortugas", venueAddress: "" })).toBe("https://www.google.com/maps?q=Darwin%20Tortugas&output=embed");
  });

  it("returns nothing without a place", () => {
    expect(mapEmbedUrl({ venue: " ", venueAddress: "" })).toBe("");
  });
});
