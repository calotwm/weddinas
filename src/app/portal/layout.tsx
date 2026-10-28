import Link from "next/link";
import { SiteFooter, TopBar } from "@/components/brand";
import { coupleNames } from "@/core/couple";
import { logout } from "../actions";
import { getCurrentCouple } from "./data";
import { PortalNav } from "./portal-nav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const couple = await getCurrentCouple();
  const pending = couple.proposals.filter((p) => p.status === "pending").length;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar>
        <Link href={`/boda/${couple.slug}`} target="_blank" className="hidden text-forest underline-offset-4 hover:underline sm:inline">
          Ver nuestra página ↗
        </Link>
        <form action={logout}>
          <button className="btn-ghost px-4 py-1.5 text-xs">Salir</button>
        </form>
      </TopBar>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <p className="eyebrow">Portal de novios</p>
        <h1 className="mt-1 mb-6 font-display text-4xl text-forest sm:text-5xl">{coupleNames(couple)}</h1>
        <PortalNav pendingProposals={pending} />
        <div className="mt-8">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
