import { SONG_MOMENTS } from "@/core/brief-catalog";
import type { Music, SongStatus } from "@/core/couple";

export const SONG_STATUS: Record<SongStatus, { label: string; className: string }> = {
  chosen: { label: "Elegida", className: "bg-mint/25 text-forest" },
  pending: { label: "Pendiente", className: "bg-peach text-rust" },
  na: { label: "No aplica", className: "bg-ink/8 text-ink/50" },
};

export function musicProgress(music: Music): { chosen: number; total: number } {
  const relevant = music.songs.filter((s) => s.status !== "na");
  return { chosen: relevant.filter((s) => s.status === "chosen").length, total: relevant.length };
}

/** Read-only song choices, grouped like the "Elección de canciones" sheet. */
export function MusicSummary({ music }: { music: Music }) {
  const byMoment = new Map(music.songs.map((s) => [s.moment, s]));
  return (
    <div className="space-y-6">
      {SONG_MOMENTS.map((group) => (
        <section key={group.group} className="card !p-0 overflow-hidden">
          <h3 className="bg-sand/60 px-6 py-3 text-xs font-semibold tracking-[0.25em] text-rust uppercase">{group.group}</h3>
          <ul className="divide-y divide-forest/5">
            {group.moments.map((m) => {
              const s = byMoment.get(m.key);
              const status = SONG_STATUS[s?.status ?? "pending"];
              return (
                <li key={m.key} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3 text-sm">
                  <span className="w-48 font-semibold text-forest">{m.label}</span>
                  <span className="min-w-0 flex-1">
                    {s?.song ? (
                      <>
                        {s.song}
                        {s.artist && <span className="text-ink/55"> · {s.artist}</span>}
                      </>
                    ) : (
                      <span className="text-ink/40">—</span>
                    )}
                    {s?.note && <span className="block text-xs text-ink/50">{s.note}</span>}
                  </span>
                  <span className={`chip ${status.className}`}>{status.label}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <section className="card grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <p className="label">Infaltables</p>
          <p className="whitespace-pre-line">{music.mustPlay || "—"}</p>
        </div>
        <div>
          <p className="label">Prohibidas</p>
          <p className="whitespace-pre-line">{music.banned || "—"}</p>
        </div>
        <div>
          <p className="label">Playlist</p>
          {music.playlistUrl ? (
            <a href={music.playlistUrl} target="_blank" rel="noreferrer noopener" className="break-all text-teal underline-offset-4 hover:underline">
              {music.playlistUrl}
            </a>
          ) : (
            "—"
          )}
        </div>
      </section>
    </div>
  );
}
