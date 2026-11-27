import type { ReactNode } from "react";
import { musicMomentKeys, musicMoments, musicTandas } from "@/core/brief-catalog";
import type { Music, SongStatus } from "@/core/couple";
import { songStatus } from "@/core/music";
import { safeHttpUrl } from "@/core/url";
import { AutoSaveForm, SortableRows } from "../auto-save-form";
import { Icon } from "../icons";
import { SubmitButton } from "../submit-button";

const formText = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);

const SONG_MAX = 300;
const NOTE_MAX = 500;

/**
 * Song choices from MusicEditor's form; the couple's and the team's save actions share it.
 * Rows come in the order they are shown, which is the dragged order. The party sets ("Tandas") have their own
 * field next to Infaltables and Prohibidas.
 */
export function musicInput(formData: FormData): Music {
  const moments = formData.getAll("moment").map(String);
  const songs = formData.getAll("song").map((v) => String(v).slice(0, SONG_MAX));
  const statuses = formData.getAll("songStatus").map(String);
  const notes = formData.getAll("songNote").map((v) => String(v).slice(0, NOTE_MAX));
  return {
    songs: moments.map((moment, i) => ({
      moment,
      song: songs[i] ?? "",
      artist: "",
      status: songStatus(statuses[i]),
      note: notes[i] ?? "",
    })),
    order: moments,
    playlistUrl: safeHttpUrl(formText(formData, "playlistUrl", 500)),
    mustPlay: formText(formData, "mustPlay", 2000),
    banned: formText(formData, "banned", 2000),
    // Only a form with the Tandas field changes them; without it the stored text stays.
    ...(formData.has("tandas") && { tandas: formText(formData, "tandas", 2000) }),
  };
}

/** Green for chosen, yellow for pending ("No aplica" was retired). */
export const SONG_STATUS: Record<SongStatus, { label: string; className: string }> = {
  chosen: { label: "Elegida", className: "bg-green-100 text-green-800" },
  pending: { label: "Pendiente", className: "bg-yellow-100 text-yellow-900" },
};

/** Tints the status select by the option picked, without client code. */
const STATUS_SELECT_TINT =
  "has-[option[value=chosen]:checked]:!bg-green-100 has-[option[value=chosen]:checked]:!text-green-800 has-[option[value=pending]:checked]:!bg-yellow-100 has-[option[value=pending]:checked]:!text-yellow-900";

export function musicProgress(music: Music): { chosen: number; total: number } {
  const byMoment = new Map(music.songs.map((s) => [s.moment, s]));
  const statuses = musicMomentKeys(music).map((key) => songStatus(byMoment.get(key)?.status));
  return { chosen: statuses.filter((s) => s === "chosen").length, total: statuses.length };
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
 * The song choices form, saved as it changes: the couple's portal and the team's panel share it.
 * `header` sits at the top of the form; `coupleId` goes along for the team's actions.
 */
export function MusicEditor({ music, save, header, coupleId }: { music: Music; save: (formData: FormData) => Promise<void>; header?: ReactNode; coupleId?: string }) {
  const byMoment = new Map(music.songs.map((s) => [s.moment, s]));
  return (
    <AutoSaveForm save={save} className="space-y-6">
      {coupleId && <input type="hidden" name="coupleId" value={coupleId} />}
      {header}

      {musicMoments(music).map((group) => (
        <section key={group.group} className="card space-y-4">
          <h3 className="text-xs font-semibold tracking-[0.25em] text-rust uppercase">{group.group}</h3>
          <SortableRows
            className="divide-y divide-forest/5 [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0"
            rows={group.moments.map((m) => {
              const s = byMoment.get(m.key);
              return {
                id: m.key,
                label: m.label,
                content: (
                  <fieldset className="grid gap-2 md:grid-cols-[10rem_1fr_9rem_auto] md:items-start md:gap-3">
                    <legend className="sr-only">{m.label}</legend>
                    <input type="hidden" name="moment" value={m.key} />
                    <span className="font-semibold text-forest md:pt-2.5" aria-hidden>{m.label}</span>
                    <textarea
                      name="song"
                      rows={2}
                      defaultValue={s?.song}
                      maxLength={SONG_MAX}
                      placeholder="Canción (y artista)"
                      aria-label={`${m.label}: canción`}
                      className="field field-sizing-content min-h-11 resize-y !py-2"
                    />
                    <select
                      name="songStatus"
                      defaultValue={songStatus(s?.status)}
                      aria-label={`${m.label}: estado`}
                      className={`field !py-2 font-semibold ${STATUS_SELECT_TINT}`}
                    >
                      {Object.entries(SONG_STATUS).map(([value, { label }]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <RemoveMomentButton moment={m} />
                    <textarea
                      name="songNote"
                      rows={2}
                      defaultValue={s?.note}
                      maxLength={NOTE_MAX}
                      placeholder="Notas o link (opcional)"
                      aria-label={`${m.label}: notas`}
                      className="field field-sizing-content min-h-11 resize-y !py-2 md:col-span-2 md:col-start-2"
                    />
                  </fieldset>
                ),
              };
            })}
          />
        </section>
      ))}

      <section className="card grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="mustPlay" className="label">Infaltables para la fiesta</label>
          <textarea id="mustPlay" name="mustPlay" rows={4} defaultValue={music.mustPlay} placeholder="Artistas o canciones que no pueden faltar" className="field" />
        </div>
        <div>
          <label htmlFor="banned" className="label">Prohibidas</label>
          <textarea id="banned" name="banned" rows={4} defaultValue={music.banned} placeholder="Lo que no quieren escuchar" className="field" />
        </div>
        <div>
          <label htmlFor="tandas" className="label">Tandas</label>
          <textarea id="tandas" name="tandas" rows={4} defaultValue={musicTandas(music)} placeholder="Una tanda por línea: ej. cumbia, rock nacional, reggaeton" className="field" />
        </div>
        <div>
          <label htmlFor="playlistUrl" className="label">Link a su playlist</label>
          <input id="playlistUrl" name="playlistUrl" type="url" defaultValue={music.playlistUrl} placeholder="https://open.spotify.com/playlist/…" className="field" />
        </div>
      </section>
    </AutoSaveForm>
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
              const status = SONG_STATUS[songStatus(s?.status)];
              return (
                <li key={m.key} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3 text-sm">
                  <span className="w-48 font-semibold text-forest">{m.label}</span>
                  <span className="min-w-0 flex-1">
                    {s?.song ? <span className="whitespace-pre-line">{s.song}</span> : <span className="text-ink/40">—</span>}
                    {s?.note && <span className="block text-xs whitespace-pre-line text-ink/50">{s.note}</span>}
                  </span>
                  <span className={`chip ${status.className}`}>{status.label}</span>
                  {removable && <RemoveMomentButton moment={m} />}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <section className="card grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="label">Infaltables</p>
          <p className="whitespace-pre-line">{music.mustPlay || "—"}</p>
        </div>
        <div>
          <p className="label">Prohibidas</p>
          <p className="whitespace-pre-line">{music.banned || "—"}</p>
        </div>
        <div>
          <p className="label">Tandas</p>
          <p className="whitespace-pre-line">{musicTandas(music) || "—"}</p>
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
