import Link from "next/link";
import { Logo } from "@/components/brand";
import { Icon, type IconName } from "@/components/icons";
import { MadeBy } from "@/components/made-by";
import { cssUrl } from "@/core/url";
import { DEMO_ACCESS_CODE } from "@/server/container";
import { LoginForm } from "./login-form";

const HERO_URL = "https://weddinas.com/wp-content/uploads/2025/07/portada.jpg";

const FEATURES: Array<[IconName, string]> = [
  ["clock", "Cuenta regresiva"],
  ["sparkle", "Propuestas"],
  ["file", "Reportes"],
  ["heart", "Su página"],
];

export default function Home() {
  const isDemo = process.env.NODE_ENV !== "production";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div aria-hidden className="absolute inset-0 scale-105 bg-cover bg-center" style={{ backgroundImage: cssUrl(HERO_URL) }} />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-forest/80 via-forest/70 to-ink/90" />

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo light className="h-12 sm:h-14" />
        <Link href="/admin/login" className="btn-light btn-sm" title="Acceso para el equipo Weddinas">
          <Icon name="lock" className="h-3.5 w-3.5" />
          Equipo
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pt-4 pb-16">
        <div className="w-full max-w-md text-center">
          <p className="font-script text-6xl text-peach">Bienvenidos</p>
          <h1 className="mt-3 font-display text-3xl leading-tight text-white sm:text-[2.6rem]">
            Hagamos que su casamiento hable de ustedes
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-cream/85">
            Ingresen el código que les pasamos para entrar a su portal.
          </p>

          <div className="card mt-8 text-left">
            <LoginForm />
            {isDemo && (
              <p className="mt-4 rounded-2xl bg-peach-soft px-4 py-2 text-center text-xs text-ink/70">
                Demo local: probá con <strong className="tracking-widest">{DEMO_ACCESS_CODE}</strong>
              </p>
            )}
          </div>

          <ul className="mt-8 grid grid-cols-4 gap-2 text-cream/85">
            {FEATURES.map(([icon, label]) => (
              <li key={label} className="flex flex-col items-center gap-2 text-[11px] tracking-wide uppercase">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                  <Icon name={icon} className="h-4.5 w-4.5" />
                </span>
                {label}
              </li>
            ))}
          </ul>

          <p className="mt-8 text-sm text-cream/70">
            ¿Perdieron el código? Escribinos a{" "}
            <a href="mailto:info@weddinas.com" className="text-peach underline-offset-4 hover:underline">info@weddinas.com</a>
          </p>
        </div>
      </main>
      <MadeBy className="relative z-10 pb-5" />
    </div>
  );
}
