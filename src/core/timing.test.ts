import { describe, expect, it } from "vitest";
import { byDayTime, formatDuration, timingDurations } from "./timing";

const at = (time: string) => ({ time });

describe("formatDuration", () => {
  it("reads like the agency's sheet", () => {
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(90)).toBe("1 h 30 min");
    expect(formatDuration(250)).toBe("4 h 10 min");
  });
});

describe("timingDurations", () => {
  it("lasts until the next moment, crossing midnight, and leaves the last one open", () => {
    expect(timingDurations([at("17:00"), at("18:00"), at("18:30"), at("23:20"), at("00:30")])).toEqual(["1 h", "30 min", "4 h 50 min", "1 h 10 min", null]);
  });

  it("shows nothing for moments at the same time", () => {
    expect(timingDurations([at("18:00"), at("18:00"), at("19:00")])).toEqual([null, "1 h", null]);
  });
});

describe("byDayTime", () => {
  it("puts the early-morning hours after the night, as the party goes past midnight", () => {
    expect([at("00:30"), at("21:30"), at("05:59"), at("06:00"), at("18:00")].sort(byDayTime).map((t) => t.time)).toEqual([
      "06:00",
      "18:00",
      "21:30",
      "00:30",
      "05:59",
    ]);
  });
});
