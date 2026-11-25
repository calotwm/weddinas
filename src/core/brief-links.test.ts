import { describe, expect, it } from "vitest";
import { linkedSongs, showsStationery } from "./brief-links";
import type { Music } from "./couple";

const music: Music = {
  songs: [
    { moment: "entrada-novia", song: "Canon — Pachelbel", artist: "", status: "chosen", note: "" },
    { moment: "vals", song: "", artist: "", status: "pending", note: "" },
  ],
  playlistUrl: "",
  mustPlay: "",
  banned: "",
};

describe("brief links to Música and Estética", () => {
  it("shows the DJ every moment with a song, by group, and each show only its own group", () => {
    const dj = linkedSongs("dj", music);
    expect(dj.flatMap((g) => g.songs.map((s) => [g.group, s.song, s.status]))).toEqual([["Ceremonia", "Canon — Pachelbel", "chosen"]]);
    expect(linkedSongs("show-ceremonia", music).map((g) => g.group)).toEqual(["Ceremonia"]);
    expect(linkedSongs("show-fiesta", music)).toEqual([]);
    expect(linkedSongs("catering", music)).toBeNull();
  });

  it("links only Papelería y detalles to the stationery designs", () => {
    expect(showsStationery("papeleria")).toBe(true);
    expect(showsStationery("dj")).toBe(false);
  });
});
