import { describe, expect, it } from "vitest";
import { timingDownloadUrl } from "./timing-sheet";

describe("timingDownloadUrl", () => {
  it("turns a Google Sheets link into its Excel download", () => {
    expect(timingDownloadUrl("https://docs.google.com/spreadsheets/d/AbC-123_x/edit?usp=sharing#gid=0")).toBe(
      "https://docs.google.com/spreadsheets/d/AbC-123_x/export?format=xlsx",
    );
  });

  it("keeps any other link as it is, and gives nothing for an empty one", () => {
    expect(timingDownloadUrl("https://example.com/timing.xlsx")).toBe("https://example.com/timing.xlsx");
    expect(timingDownloadUrl("")).toBeNull();
  });
});
