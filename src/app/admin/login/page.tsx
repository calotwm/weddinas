import Link from "next/link";
import { Logo } from "@/components/brand";
import { Icon } from "@/components/icons";
import { MadeBy } from "@/components/made-by";
import { teamLoginUsesEmail } from "@/server/auth";
import { AdminLoginForm } from "../forms";

// Reads ADMIN_USERS on every request, so the form matches the login mode in use.
export const dynamic = "force-dynamic";

// Photo: Bruno Ngarukiye on Unsplash (Unsplash License), self-hosted to keep the CSP tight.
const TEAM_PHOTO = "/img/team-login.jpg";

export default function AdminLoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden className="absolute inset-0 scale-105 bg-cover bg-center" style={{ backgroundImage: `url("${TEAM_PHOTO}")` }} />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-ink/75 via-forest/80 to-ink/95" />
      <div className="relative z-10 w-full max-w-sm text-center">
        <Logo light className="mx-auto mb-6 h-14" />
        <p className="font-script text-5xl text-peach">Equipo Weddinas</p>
        <p className="mt-1 mb-8 text-xs tracking-[0.3em] text-cream/70 uppercase">Panel de organización</p>
        <div className="card text-left">
          <AdminLoginForm withEmail={teamLoginUsesEmail()} />
        </div>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm text-cream/80 transition-colors hover:text-peach">
          <Icon name="arrowLeft" className="h-4 w-4" />
          Volver al portal de novios
        </Link>
        <MadeBy className="mt-10" />
      </div>
    </main>
  );
}
