import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { coupleAlerts, type CoupleAlert } from "@/core/alerts";
import { coupleNames, isPresented } from "@/core/couple";
import { getCountdown } from "@/core/countdown";
import { formatDay, formatMoney, formatMonth, formatShortDate, today, weddingDateToIso } from "@/lib/format";
import { requireAdmin } from "@/server/auth";
import { portal, rates, welcomeTemplate } from "@/server/container";
import { siteOrigin } from "@/server/site-url";
import { CreateCoupleForm, ImportCoupleForm } from "../forms";
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

const ALERT_LINK: Record<CoupleAlert["kind"], string> = { payment: "/presupuesto", proposal: "", task: "" };
const ALERT_ICON: Record<CoupleAlert["kind"], IconName> = { payment: "dollar", proposal: "sparkle", task: "checklist" };

function alertText(a: CoupleAlert): string {
  switch (a.kind) {
    case "payment":
      return `${a.title}: ${formatMoney(a.amount, a.currency)} · ${a.overdue ? "venció el" : "vence el"} ${formatDay(a.dueDate)}`;
    case "proposal":
      return `“${a.title}” sin responder hace ${a.days} días`;
    case "task":
      return `“${a.title}” quedó pendiente de ${formatMonth(a.month)}`;
  }
}

function Alerts({ alerts }: { alerts: CoupleAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <section aria-labelledby="alerts-title" className="card">
      <h2 id="alerts-title" className="flex items-center gap-2 font-semibold text-rust">
        <Icon name="bell" className="h-5 w-5" />
        Alertas ({alerts.length})
      </h2>
      <ul className="mt-3 divide-y divide-forest/6">
        {alerts.map((a) => (
          <li key={`${a.kind}-${a.coupleId}-${a.id}`}>
            <Link
              href={`/admin/parejas/${a.coupleId}${ALERT_LINK[a.kind]}`}
              className="flex items-start gap-3 rounded-xl py-2.5 text-sm hover:bg-peach-soft/60"
            >
              <Icon name={ALERT_ICON[a.kind]} className={`mt-0.5 h-4 w-4 shrink-0 ${a.kind === "payment" && a.overdue ? "text-rust" : "text-forest/60"}`} />
              <span className="min-w-0">
                <span className="font-semibold text-forest">{a.names}</span>
                <span className="text-ink/75"> · {alertText(a)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function AdminHome() {
  await requireAdmin();
  const [couples, origin, template, ipc] = await Promise.all([
    portal.listCouples(),
    siteOrigin(),
    welcomeTemplate(),
    rates.ipc(),
  ]);
  const alerts = coupleAlerts(couples, today(), new Date(), ipc);

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
      pending: c.proposals.filter((p) => isPresented(p) && p.status === "pending").length,
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

      <Alerts alerts={alerts} />

      <div className="space-y-4">
        <CoupleList rows={rows} />
        <details className="card group">
          <summary className="flex cursor-pointer list-none items-center gap-3 font-semibold text-forest">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-cream transition-transform group-open:rotate-45">
              <Icon name="plus" className="h-4 w-4" />
            </span>
            Agregar pareja
          </summary>
          <div className="mt-5 grid gap-8 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-sm text-ink/60">
                Se genera su código de acceso y su página pública.{" "}
                <Link href="/admin/mensaje" className="font-semibold text-forest underline-offset-4 hover:underline">
                  Editar el mensaje de bienvenida
                </Link>
              </p>
              <CreateCoupleForm origin={origin} template={template} />
            </div>
            <div className="lg:border-l lg:border-forest/10 lg:pl-8">
              <h3 className="text-sm font-semibold text-forest">Importar desde las planillas</h3>
              <p className="mt-2 mb-3 text-xs text-ink/60">Crea la pareja con brief, presupuesto, pagos, canciones y familia. Si algo del archivo no es válido, no se guarda nada.</p>
              <ImportCoupleForm origin={origin} template={template} />
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
