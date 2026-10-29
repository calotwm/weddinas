import { Icon, type IconName } from "@/components/icons";
import { coupleNames } from "@/core/couple";
import { getCountdown } from "@/core/countdown";
import { formatShortDate, weddingDateToIso } from "@/lib/format";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";
import { siteOrigin } from "@/server/site-url";
import { CreateCoupleForm } from "../forms";
import { CoupleList, type CoupleRow } from "./couple-list";

export const dynamic = "force-dynamic";

function Stat({ icon, value, label, tone = "text-forest" }: { icon: IconName; value: number; label: string; tone?: string }) {
  return (
    <div className="card flex items-center gap-4 p-5 sm:p-5">
      <span className="icon-badge"><Icon name={icon} /></span>
      <div>
        <p className={`font-display text-3xl leading-none ${tone}`}>{value}</p>
        <p className="mt-1 text-xs tracking-wide text-ink/55 uppercase">{label}</p>
      </div>
    </div>
  );
}

export default async function AdminHome() {
  await requireAdmin();
  const couples = await portal.listCouples();

  const rows: CoupleRow[] = couples.map((c) => {
    const { days, isPast } = getCountdown(new Date(weddingDateToIso(c.weddingDate)));
    const done = c.tasks.filter((t) => t.done).length;
    return {
      id: c.id,
      slug: c.slug,
      names: coupleNames(c),
      date: formatShortDate(weddingDateToIso(c.weddingDate)),
      days,
      isPast,
      pending: c.proposals.filter((p) => p.status === "pending").length,
      progress: c.tasks.length ? Math.round((done / c.tasks.length) * 100) : 0,
    };
  });

  const active = rows.filter((r) => !r.isPast);
  const soon = active.filter((r) => r.days <= 30).length;
  const pendingTotal = active.reduce((sum, r) => sum + r.pending, 0);
  const answered = couples.flatMap((c) => c.proposals).filter((p) => p.status !== "pending").length;

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Panel del equipo</p>
        <h1 className="mt-1 font-display text-4xl text-forest sm:text-5xl">Parejas</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon="users" value={active.length} label="Parejas activas" />
        <Stat icon="calendar" value={soon} label="Se casan en 30 días" tone="text-rust" />
        <Stat icon="sparkle" value={pendingTotal} label="Propuestas sin responder" />
        <Stat icon="check" value={answered} label="Propuestas respondidas" tone="text-teal" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <CoupleList rows={rows} />
        <aside className="card lg:sticky lg:top-24">
          <h2 className="section-title mb-1">Nueva pareja</h2>
          <p className="mb-5 text-sm text-ink/60">Se genera su código de acceso y su página pública.</p>
          <CreateCoupleForm origin={await siteOrigin()} />
        </aside>
      </div>
    </div>
  );
}
