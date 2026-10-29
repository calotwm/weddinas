/* eslint-disable @next/next/no-img-element -- brand assets are served by weddinas.com */
import Link from "next/link";

export const LOGO_URL = "https://weddinas.com/wp-content/uploads/2023/06/logo-menu.png";
export const LOGO_LIGHT_URL = "https://weddinas.com/wp-content/uploads/2023/06/isologo-completo-claro.png";

export function Logo({ light = false, className = "h-10" }: { light?: boolean; className?: string }) {
  return <img src={light ? LOGO_LIGHT_URL : LOGO_URL} alt="Weddinas" className={`w-auto ${className}`} />;
}

export function SiteFooter({ children }: { children?: React.ReactNode }) {
  return (
    <footer className="bg-forest px-6 py-10 text-center text-sm text-cream/70">
      <Logo light className="mx-auto mb-4 h-11 opacity-90" />
      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <a href="https://weddinas.com" className="transition-colors hover:text-peach">weddinas.com</a>
        <span aria-hidden>·</span>
        <a href="mailto:info@weddinas.com" className="transition-colors hover:text-peach">info@weddinas.com</a>
        <span aria-hidden>·</span>
        <a href="https://www.instagram.com/weddinas/" className="transition-colors hover:text-peach">@weddinas</a>
      </p>
      {children}
    </footer>
  );
}

export function TopBar({ label, children }: { label?: string; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-forest/10 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Inicio">
            <Logo className="h-8 sm:h-9" />
          </Link>
          {label && (
            <span className="hidden border-l border-forest/15 pl-3 text-xs tracking-[0.2em] text-forest/70 uppercase sm:inline">
              {label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm sm:gap-3">{children}</div>
      </div>
    </header>
  );
}
