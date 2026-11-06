import { musicMomentKeys, musicMoments } from "@/core/brief-catalog";
import type { Music, SongStatus } from "@/core/couple";
import { Icon } from "../icons";
import { SubmitButton } from "../submit-button";

export const SONG_STATUS: Record<SongStatus, { label: string; className: string }> = {
  chosen: { label: "Elegida", className: "bg-mint/25 text-forest" },
  pending: { label: "Pendiente", className: "bg-peach text-rust" },
  na: { label: "No aplica", className: "bg-ink/8 text-ink/50" },
};

export function musicProgress(music: Music): { chosen: number; total: number } {
  const byMoment = new Map(music.songs.map((s) => [s.moment, s]));
  const relevant = musicMomentKeys(music).map((key) => byMoment.get(key)?.status ?? "pending").filter((s) => s !== "na");
  return { chosen: relevant.filter((s) => s === "chosen").length, total: relevant.length };
}

/** Id of the hidden form that removes a moment; buttons inside other forms point at it with the `form` attribute. */
export const removeMomentFormId = (key: string) => `remove-moment-${key}`;

/** Button that removes a moment through its hidden form (see MusicMomentForms). */
export function RemoveMomentButton({ moment }: { moment: { key: string; label: string } }) {
  return (
    <button form={removeMomentFormId(moment.key)} className="btn-icon print:hidden" aria-label={`Quitar el momento ${moment.label}`}>
      <Icon name="trash" className="h-4 w-4" />
    </button>
  );
}

/**
 * Form to add a moment, plus one hidden form per moment for RemoveMomentButton.
 * Rendered outside the song form so adding or removing never submits (or autosaves) the songs.
 */
export function MusicMomentForms({
  music,
  add,
  remove,
  coupleId,
}: {
  music: Music;
  add: (formData: FormData) => Promise<void>;
  remove: (formData: FormData) => Promise<void>;
  coupleId?: string;
}) {
  const groups = musicMoments(music);
  return (
    <>
      <form action={add} className="card grid gap-3 sm:grid-cols-[1fr_12rem_12rem_auto] sm:items-end">
        {coupleId && <input type="hidden" name="coupleId" value={coupleId} />}
        <div>
          <label htmlFor="moment-label" className="label">Nuevo momento</label>
          <input id="moment-label" name="label" required maxLength={120} placeholder="Ej: Baile sorpresa" className="field" />
        </div>
        <div>
          <label htmlFor="moment-group" className="label">En</label>
          <select id="moment-group" name="group" className="field">
            {groups.map((g) => (
              <option key={g.group} value={g.group}>{g.group}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="moment-new-group" className="label">O en una sección nueva</label>
          <input id="moment-new-group" name="newGroup" maxLength={60} placeholder="Ej: After" className="field" />
        </div>
        <SubmitButton pendingText="Sumando…">
          <Icon name="plus" className="h-4 w-4" />
          Sumar
        </SubmitButton>
      </form>
      {groups.flatMap((g) => g.moments).map((m) => (
        <form key={m.key} id={removeMomentFormId(m.key)} action={remove} hidden>
          {coupleId && <input type="hidden" name="coupleId" value={coupleId} />}
          <input type="hidden" name="moment" value={m.key} />
        </form>
      ))}
    </>
  );
}

/** Read-only song choices, grouped like the "Elección de canciones" sheet plus the couple's own moments. */
export function MusicSummary({ music, removable = false }: { music: Music; removable?: boolean }) {
  const byMoment = new Map(music.songs.map((s) => [s.moment, s]));
  return (
    <div className="space-y-6">
      {musicMoments(music).map((group) => (
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
                  {removable && <RemoveMomentButton moment={m} />}
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
