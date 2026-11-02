import { describe, expect, it } from "vitest";
import { adjustedAmount, convert, extendIpc, ipcFactor, type IpcSeries } from "./money";

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

describe("extendIpc", () => {
  const base: IpcSeries = { points: [{ month: "2026-07", value: 100 }, { month: "2026-08", value: 110 }] };

  it("adds the next month from its monthly variation", () => {
    expect(extendIpc(base, { month: "2026-09", variationPct: 2 }).points.at(-1)).toEqual({ month: "2026-09", value: 112.2 });
  });

  it("ignores a variation for a month already in the series or not right after it", () => {
    expect(extendIpc(base, { month: "2026-08", variationPct: 5 })).toEqual(base);
    expect(extendIpc(base, { month: "2026-11", variationPct: 5 })).toEqual(base);
  });

  it("rolls over the year", () => {
    const dec: IpcSeries = { points: [{ month: "2026-12", value: 200 }] };
    expect(extendIpc(dec, { month: "2027-01", variationPct: 1 }).points.at(-1)).toEqual({ month: "2027-01", value: 202 });
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
