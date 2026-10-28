import { Logo, SiteFooter } from "@/components/brand";
import { DEMO_ACCESS_CODE } from "@/server/container";
import { LoginForm } from "./login-form";

const HERO_URL = "https://weddinas.com/wp-content/uploads/2025/07/portada.jpg";

export default function Home() {
  const isDemo = process.env.NODE_ENV !== "production";

  return (
    <div className="flex min-h-screen flex-col">
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_URL})` }}
        />
        <div aria-hidden className="absolute inset-0 bg-forest/70" />

        <div className="relative w-full max-w-md text-center">
          <Logo light className="mx-auto mb-8 h-16" />
          <p className="font-script text-5xl text-peach">Bienvenidos</p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-white sm:text-4xl">
            Hagamos que su casamiento hable de ustedes
          </h1>
          <p className="mt-4 text-peach/90">
            Ingresen el código que les pasamos para ver su cuenta regresiva, propuestas, reportes y armar su página.
          </p>

          <div className="card mt-8 text-left">
            <LoginForm />
            {isDemo && (
              <p className="mt-4 text-center text-xs text-ink/60">
                Demo local: probá con <strong className="tracking-widest">{DEMO_ACCESS_CODE}</strong>
              </p>
            )}
          </div>

          <p className="mt-6 text-sm text-peach/80">
            ¿Perdieron el código? Escribinos a{" "}
            <a href="mailto:info@weddinas.com" className="underline hover:text-peach">info@weddinas.com</a>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
