import { MusicEditor, MusicMomentForms, musicProgress } from "@/components/planner/music";
import { addMusicMoment, removeMusicMoment, saveMusic } from "../actions";
import { getCurrentCouple } from "../data";

export default async function MusicPage() {
  const couple = await getCurrentCouple();
  const { music } = couple;
  const { chosen, total } = musicProgress(music);

  return (
    <div className="space-y-6">
      <MusicEditor
        music={music}
        save={saveMusic}
        header={
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl text-forest">Elección de canciones</h2>
              <p className="mt-1 max-w-2xl text-sm text-ink/70">
                Elijan la canción de cada momento. Si todavía no saben, déjenla en &quot;Pendiente&quot;; si un momento no va, márquenlo &quot;No aplica&quot; o quítenlo. Al final pueden sumar momentos propios.
              </p>
            </div>
            <span className="chip bg-mint/25 text-forest">{chosen} de {total} elegidas</span>
          </div>
        }
      />

      <MusicMomentForms music={music} add={addMusicMoment} remove={removeMusicMoment} />
    </div>
  );
}
