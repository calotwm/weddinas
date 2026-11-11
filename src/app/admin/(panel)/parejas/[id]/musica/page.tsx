import { notFound } from "next/navigation";
import { MusicEditor, MusicMomentForms, musicProgress } from "@/components/planner/music";
import { addMusicMoment, removeMusicMoment, saveMusic } from "@/app/admin/planner-actions";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

export const dynamic = "force-dynamic";

export default async function MusicAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const couple = await portal.getCouple((await params).id);
  if (!couple) notFound();
  const { chosen, total } = musicProgress(couple.music);

  return (
    <div className="space-y-6">
      <MusicEditor
        music={couple.music}
        save={saveMusic}
        coupleId={couple.id}
        header={
          <div>
            <h2 className="font-display text-3xl text-forest">Elección de canciones</h2>
            <p className="hint">
              La completa la pareja desde su portal y vos también podés editarla: los cambios se guardan solos · {chosen} de {total} momentos elegidos.
            </p>
          </div>
        }
      />
      <MusicMomentForms music={couple.music} add={addMusicMoment} remove={removeMusicMoment} coupleId={couple.id} />
    </div>
  );
}
