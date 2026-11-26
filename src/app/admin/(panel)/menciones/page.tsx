import Link from "next/link";
import { setMentionDone } from "@/app/admin/comment-actions";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { memberName, mentionsFor } from "@/core/team-comments";
import { currentTeamUser, requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";
import { MarkMentionsSeen } from "./mark-seen";

export const dynamic = "force-dynamic";

const when = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

/** Every comment that mentions the logged-in team member: pending ones first, until they mark them done. */
export default async function MentionsPage() {
  await requireAdmin();
  const me = await currentTeamUser();
  if (!me) {
    return (
      <div className="card">
        <h2 className="font-display text-3xl text-forest">Menciones</h2>
        <p className="hint mt-2">Las menciones son personales: entrá con tu mail del equipo para verlas.</p>
      </div>
    );
  }
  const mentions = mentionsFor(await portal.listCouples(), me);
  const pending = mentions.filter((m) => !m.done);

  return (
    <div className="space-y-6">
      <MarkMentionsSeen />
      <div>
        <h2 className="font-display text-3xl text-forest">Menciones</h2>
        <p className="hint">
          Los comentarios del brief donde te mencionaron con @{memberName(me)}. Marcalos como hechos cuando los resuelvas.
        </p>
      </div>
      {mentions.length === 0 && <p className="card text-ink/60">Todavía nadie te mencionó.</p>}
      {mentions.length > 0 && <p className="text-sm text-ink/60">{pending.length === 0 ? "No tenés menciones pendientes." : `${pending.length} pendiente${pending.length === 1 ? "" : "s"}`}</p>}
      <ul className="space-y-3">
        {mentions.map((m) => (
          <li key={m.comment.id} className={`card flex flex-wrap items-start gap-4 !py-4 ${m.done ? "opacity-60" : ""}`}>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="flex flex-wrap items-center gap-2 text-xs text-ink/55">
                {!m.seen && <span className="chip bg-rust text-cream">Nueva</span>}
                <span className="font-semibold text-forest">{m.comment.author ? memberName(m.comment.author) : "El equipo"}</span>
                <span>{when(m.comment.at)}</span>
                <span>·</span>
                <Link href={`/admin/parejas/${m.coupleId}/brief#rubro-${m.blockKey}`} className="font-semibold text-teal underline">
                  {m.blockName} · {m.coupleName}
                </Link>
              </p>
              <p className={`text-sm whitespace-pre-line ${m.done ? "line-through" : ""}`}>{m.comment.text}</p>
            </div>
            <form action={setMentionDone}>
              <input type="hidden" name="coupleId" value={m.coupleId} />
              <input type="hidden" name="commentId" value={m.comment.id} />
              <input type="hidden" name="done" value={m.done ? "0" : "1"} />
              <SubmitButton className={m.done ? "btn-ghost btn-sm" : "btn-primary btn-sm"} pendingText="…">
                <Icon name="check" className="h-3.5 w-3.5" />
                {m.done ? "Volver a pendiente" : "Marcar hecha"}
              </SubmitButton>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
