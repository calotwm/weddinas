import Link from "next/link";
import { Logo } from "@/components/brand";
import { Icon } from "@/components/icons";
import { MadeBy } from "@/components/made-by";
import { AdminLoginForm } from "../forms";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-forest to-ink px-4">
      <div className="w-full max-w-sm text-center">
        <Logo light className="mx-auto mb-6 h-14" />
        <p className="font-script text-5xl text-peach">Equipo Weddinas</p>
        <p className="mt-1 mb-8 text-xs tracking-[0.3em] text-cream/60 uppercase">Panel de organización</p>
        <div className="card text-left">
          <AdminLoginForm />
        </div>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm text-cream/70 transition-colors hover:text-peach">
          <Icon name="arrowLeft" className="h-4 w-4" />
          Volver al portal de novios
        </Link>
        <MadeBy className="mt-10" />
      </div>
    </main>
  );
}
