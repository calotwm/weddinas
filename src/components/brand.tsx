/* eslint-disable @next/next/no-img-element -- brand assets are served by weddinas.com */
import Link from "next/link";

export const LOGO_URL = "https://weddinas.com/wp-content/uploads/2023/06/logo-menu.png";
export const LOGO_LIGHT_URL = "https://weddinas.com/wp-content/uploads/2023/06/isologo-completo-claro.png";

export function Logo({ light = false, className = "h-10" }: { light?: boolean; className?: string }) {
  return <img src={light ? LOGO_LIGHT_URL : LOGO_URL} alt="Weddinas" className={`w-auto ${className}`} />;
}

export function SiteFooter() {
  return (
    <footer className="bg-forest px-6 py-10 text-center text-sm text-peach/80">
      <Logo light className="mx-auto mb-4 h-12" />
      <p>
        <a href="https://weddinas.com" className="hover:text-peach">weddinas.com</a> ·{" "}
        <a href="mailto:info@weddinas.com" className="hover:text-peach">info@weddinas.com</a> ·{" "}
        <a href="https://www.instagram.com/weddinas/" className="hover:text-peach">@weddinas</a>
      </p>
    </footer>
  );
}

export function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-forest/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Inicio">
          <Logo className="h-9" />
        </Link>
        <div className="flex items-center gap-3 text-sm">{children}</div>
      </div>
    </header>
  );
}
