import Link from "next/link";
import { SiteFooter, TopBar } from "@/components/brand";
import { Icon } from "@/components/icons";
import { coupleNames, isPresented } from "@/core/couple";
import { getCountdown } from "@/core/countdown";
import { coupleNotifications, unreadCount } from "@/core/notifications";
import { formatWeddingDate, weddingDateToIso } from "@/lib/format";
import { logout } from "../actions";
import { getCurrentCouple } from "./data";
import { PortalNav } from "./portal-nav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const couple = await getCurrentCouple();
  const pending = couple.proposals.filter((p) => isPresented(p) && p.status === "pending").length;
  const unread = unreadCount(coupleNotifications(couple), couple.notificationsSeenAt);
  const { days, isPast } = getCountdown(new Date(weddingDateToIso(couple.weddingDate)));

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar label="Portal de novios">
        <Link href={`/boda/${couple.slug}`} target="_blank" className="btn-light btn-sm hidden sm:inline-flex">
          <Icon name="external" className="h-3.5 w-3.5" />
          Nuestra página
        </Link>
        <form action={logout}>
          <button className="btn-light btn-sm" aria-label="Cerrar sesión">
            <Icon name="logout" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </form>
      </TopBar>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-16 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-script text-3xl text-rust">Hola,</p>
            <h1 className="font-display text-4xl leading-tight text-forest sm:text-5xl">{coupleNames(couple)}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-ink/60">
              <Icon name="calendar" className="h-4 w-4 text-teal" />
              <span className="inline-block first-letter:uppercase">{formatWeddingDate(couple.weddingDate)}</span>
            </p>
          </div>
          <span className="chip bg-peach text-forest">
            <Icon name="heart" className="h-3.5 w-3.5 text-rust" />
            {isPast ? "¡Ya se casaron!" : days === 0 ? "¡Es hoy!" : `Faltan ${days} días`}
          </span>
        </div>
        <PortalNav pendingProposals={pending} unread={unread} />
        <div className="mt-8">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
