import { musicMoments } from "./brief-catalog";
import type { Music, SongStatus } from "./couple";

/** Brief rubros that show what Música holds: the DJ sees every group, each show the group it plays in. */
const MUSIC_GROUPS: Record<string, string[] | "all"> = {
  dj: "all",
  "show-ceremonia": ["Ceremonia"],
  "show-intervencion": ["Comidas"],
  "show-fiesta": ["Fiesta"],
};

export interface LinkedSongGroup {
  group: string;
  songs: Array<{ label: string; song: string; status: SongStatus }>;
}

/** The Música songs a brief rubro shows, by group and in Música's order; null for rubros not linked to Música. */
export function linkedSongs(blockKey: string, music: Music): LinkedSongGroup[] | null {
  const groups = MUSIC_GROUPS[blockKey];
  if (!groups) return null;
  const byMoment = new Map(music.songs.map((s) => [s.moment, s]));
  return musicMoments(music)
    .filter((g) => groups === "all" || groups.includes(g.group))
    .map((g) => ({
      group: g.group,
      songs: g.moments.flatMap((m) => {
        const choice = byMoment.get(m.key);
        return choice?.song.trim() ? [{ label: m.label, song: choice.song, status: choice.status }] : [];
      }),
    }))
    .filter((g) => g.songs.length > 0);
}

/** "Papelería y detalles" shows the stationery designs uploaded in Estética. */
export const showsStationery = (blockKey: string) => blockKey === "papeleria";
