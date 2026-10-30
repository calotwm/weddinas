import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icons";
import { coupleNames } from "@/core/couple";
import { getCountdown } from "@/core/countdown";
import { formatWeddingDate, weddingDateToIso } from "@/lib/format";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";
import { siteOrigin } from "@/server/site-url";
import { CoupleTabs } from "./tabs";

export default async function CoupleAdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  await requireAdmin();
  const couple = await portal.getCouple((await params).id);
  if (!couple) notFound();

  const publicUrl = `${await siteOrigin()}/boda/${couple.slug}`;
  const { days, isPast } = getCountdown(new Date(weddingDateToIso(couple.weddingDate)));
  const done = couple.tasks.filter((t) => t.done).length;
  const pending = couple.proposals.filter((p) => p.status === "pending").length;
  const confirmed = couple.brief.filter((b) => b.kind === "vendor" && b.status === "confirmed").length;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-teal hover:underline">
          <Icon name="arrowLeft" className="h-4 w-4" />
          Todas las parejas
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl text-forest sm:text-5xl">{coupleNames(couple)}</h1>
            <p className="mt-1 inline-block text-ink/60 first-letter:uppercase">{formatWeddingDate(couple.weddingDate)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={publicUrl} label="Copiar link de la página" />
            <Link href={`/boda/${couple.slug}`} target="_blank" className="btn-ghost btn-sm">
              <Icon name="external" className="h-3.5 w-3.5" />
              Ver página
            </Link>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip bg-white text-forest ring-1 ring-forest/10">
            <Icon name="calendar" className="h-3.5 w-3.5" />
            {isPast ? "Ya fue" : `Faltan ${days} días`}
          </span>
          <span className="chip bg-white text-forest ring-1 ring-forest/10">
            <Icon name="users" className="h-3.5 w-3.5" />
            {confirmed} proveedor{confirmed === 1 ? "" : "es"} confirmado{confirmed === 1 ? "" : "s"}
          </span>
          <span className="chip bg-white text-forest ring-1 ring-forest/10">
            <Icon name="checklist" className="h-3.5 w-3.5" />
            Checklist {done}/{couple.tasks.length}
          </span>
          <span className={`chip ring-1 ring-forest/10 ${pending ? "bg-peach text-rust" : "bg-white text-forest"}`}>
            <Icon name="sparkle" className="h-3.5 w-3.5" />
            {pending} propuesta{pending === 1 ? "" : "s"} pendiente{pending === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <CoupleTabs coupleId={couple.id} />
      {children}
    </div>
  );
}
