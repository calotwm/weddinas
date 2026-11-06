import { musicProgress, SONG_STATUS } from "@/components/planner/music";
import { AutoSaveForm } from "@/components/auto-save-form";
import { SONG_MOMENTS } from "@/core/brief-catalog";
import { saveMusic } from "../actions";
import { getCurrentCouple } from "../data";

export default async function MusicPage() {
  const couple = await getCurrentCouple();
  const { music } = couple;
  const byMoment = new Map(music.songs.map((s) => [s.moment, s]));
  const { chosen, total } = musicProgress(music);

  return (
    <AutoSaveForm save={saveMusic} className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-forest">Elección de canciones</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink/70">
            Elijan la canción de cada momento. Si todavía no saben, déjenla en &quot;Pendiente&quot;; si un momento no va, marquen &quot;No aplica&quot;.
          </p>
        </div>
        <span className="chip bg-mint/25 text-forest">{chosen} de {total} elegidas</span>
      </div>

      {SONG_MOMENTS.map((group) => (
        <section key={group.group} className="card space-y-4">
          <h3 className="text-xs font-semibold tracking-[0.25em] text-rust uppercase">{group.group}</h3>
          <div className="divide-y divide-forest/5">
            {group.moments.map((m) => {
              const s = byMoment.get(m.key);
              return (
                <fieldset key={m.key} className="grid gap-2 py-4 first:pt-0 last:pb-0 md:grid-cols-[10rem_1fr_1fr_9rem] md:items-center md:gap-3">
                  <legend className="sr-only">{m.label}</legend>
                  <input type="hidden" name="moment" value={m.key} />
                  <span className="font-semibold text-forest" aria-hidden>{m.label}</span>
                  <input name="song" defaultValue={s?.song} maxLength={200} placeholder="Canción" aria-label={`${m.label}: canción`} className="field !py-2" />
                  <input name="artist" defaultValue={s?.artist} maxLength={200} placeholder="Artista" aria-label={`${m.label}: artista`} className="field !py-2" />
                  <select name="songStatus" defaultValue={s?.status ?? "pending"} aria-label={`${m.label}: estado`} className="field !py-2">
                    {Object.entries(SONG_STATUS).map(([value, { label }]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <input name="songNote" defaultValue={s?.note} maxLength={500} placeholder="Notas o link (opcional)" aria-label={`${m.label}: notas`} className="field !py-2 md:col-span-3 md:col-start-2" />
                </fieldset>
              );
            })}
          </div>
        </section>
      ))}

      <section className="card grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="mustPlay" className="label">Infaltables para la fiesta</label>
          <textarea id="mustPlay" name="mustPlay" rows={4} defaultValue={music.mustPlay} placeholder="Tandas, artistas o canciones que no pueden faltar" className="field" />
        </div>
        <div>
          <label htmlFor="banned" className="label">Prohibidas</label>
          <textarea id="banned" name="banned" rows={4} defaultValue={music.banned} placeholder="Lo que no quieren escuchar" className="field" />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="playlistUrl" className="label">Link a su playlist</label>
          <input id="playlistUrl" name="playlistUrl" type="url" defaultValue={music.playlistUrl} placeholder="https://open.spotify.com/playlist/…" className="field" />
        </div>
      </section>
    </AutoSaveForm>
  );
}
