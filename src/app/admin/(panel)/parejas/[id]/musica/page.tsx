import { notFound } from "next/navigation";
import { MusicSummary, musicProgress } from "@/components/planner/music";
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
      <div>
        <h2 className="font-display text-3xl text-forest">Elección de canciones</h2>
        <p className="hint">
          La completa la pareja desde su portal · {chosen} de {total} momentos elegidos.
        </p>
      </div>
      <MusicSummary music={couple.music} />
    </div>
  );
}
