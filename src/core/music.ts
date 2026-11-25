import type { SongChoice, SongStatus } from "./couple";

/** Joins a legacy artist into the song text ("Song — Artist") unless the song already names it. */
export function songWithArtist(song: string, artist: string): string {
  const title = song.trim();
  const by = artist.trim();
  if (!by || title.toLowerCase().includes(by.toLowerCase())) return title;
  return title ? `${title} — ${by}` : by;
}

/** Only "chosen" stays chosen; anything else (including the retired "No aplica") is pending. */
export const songStatus = (status: unknown): SongStatus => (status === "chosen" ? "chosen" : "pending");

/** A song choice in its current shape: artist folded into the song text, two statuses only. */
export function normalizeSongChoice(choice: SongChoice): SongChoice {
  return {
    moment: choice.moment,
    song: songWithArtist(choice.song ?? "", choice.artist ?? ""),
    artist: "",
    status: songStatus(choice.status),
    note: (choice.note ?? "").trim(),
  };
}
