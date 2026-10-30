import { describe, expect, it } from "vitest";
import { adjustedAmount, convert, ipcFactor, type IpcSeries } from "./money";

const ipc: IpcSeries = {
  points: [
    { month: "2026-06", value: 100 },
    { month: "2026-07", value: 102 },
    { month: "2026-08", value: 105 },
  ],
};

describe("ipcFactor", () => {
  it("is the latest published index over the base month index", () => {
    expect(ipcFactor(ipc, "2026-06")).toEqual({ factor: 1.05, latestMonth: "2026-08" });
  });

  it("is 1 when the base month is the latest or later (not published yet)", () => {
    expect(ipcFactor(ipc, "2026-08").factor).toBe(1);
    expect(ipcFactor(ipc, "2026-10").factor).toBe(1);
  });

  it("uses the earliest point when the base month predates the series", () => {
    expect(ipcFactor(ipc, "2025-01").factor).toBe(1.05);
  });

  it("is 1 without series data", () => {
    expect(ipcFactor(null, "2026-06")).toEqual({ factor: 1, latestMonth: null });
  });
});

describe("adjustedAmount", () => {
  it("adjusts ARS amounts marked ipc", () => {
    expect(adjustedAmount({ amount: 1000, currency: "ARS", adjustment: "ipc", baseMonth: "2026-06" }, ipc)).toBe(1050);
  });

  it("leaves frozen amounts and USD amounts untouched", () => {
    expect(adjustedAmount({ amount: 1000, currency: "ARS", adjustment: "frozen", baseMonth: "2026-06" }, ipc)).toBe(1000);
    expect(adjustedAmount({ amount: 1000, currency: "USD", adjustment: "ipc", baseMonth: "2026-06" }, ipc)).toBe(1000);
  });
});

describe("convert", () => {
  it("converts between ARS and USD with ARS per USD", () => {
    expect(convert(1500, "ARS", "USD", 1500)).toBe(1);
    expect(convert(2, "USD", "ARS", 1500)).toBe(3000);
    expect(convert(7, "USD", "USD", 1500)).toBe(7);
  });

  it("returns null when a conversion has no quote", () => {
    expect(convert(10, "USD", "ARS", null)).toBeNull();
  });
});
