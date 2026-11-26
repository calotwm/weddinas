import { describe, expect, it } from "vitest";
import { shownBlockStatus } from "./couple";

describe("brief status (phase 9)", () => {
  it("S12: offers only Pendiente and Confirmado; every stored status but confirmed reads as pending", () => {
    expect(shownBlockStatus("confirmed")).toBe("confirmed");
    expect(shownBlockStatus("deciding")).toBe("deciding");
    expect(shownBlockStatus("searching")).toBe("deciding");
    expect(shownBlockStatus("na")).toBe("deciding");
  });
});
