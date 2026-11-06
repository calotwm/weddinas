"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

// `short` is the visible label (nine sections must fit one row on desktop); `label` is the full name shown on hover.
const LINKS: Array<{ href: string; label: string; short: string; icon: IconName }> = [
  { href: "/portal", label: "Resumen", short: "Resumen", icon: "home" },
  { href: "/portal/propuestas", label: "Propuestas", short: "Propuestas", icon: "sparkle" },
  { href: "/portal/proveedores", label: "Proveedores", short: "Proveedores", icon: "users" },
  { href: "/portal/presupuesto", label: "Presupuesto", short: "Presupuesto", icon: "dollar" },
  { href: "/portal/notificaciones", label: "Notificaciones", short: "Notificaciones", icon: "bell" },
  { href: "/portal/checklist", label: "Checklist", short: "Checklist", icon: "checklist" },
  { href: "/portal/musica", label: "Música", short: "Música", icon: "music" },
  { href: "/portal/familia", label: "Fotos familiares", short: "Familia", icon: "heart" },
  { href: "/portal/mi-pagina", label: "Nuestra página", short: "Página", icon: "edit" },
];

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute top-1 right-2 rounded-full bg-rust px-1.5 text-[11px] leading-5 font-semibold text-white lg:static">
      {count}
    </span>
  );
}

export function PortalNav({ pendingProposals, unread }: { pendingProposals: number; unread: number }) {
  const pathname = usePathname();
  // Opening Notificaciones marks them read, so its badge goes away right there.
  const badges: Record<string, number> = {
    "/portal/propuestas": pendingProposals,
    "/portal/notificaciones": pathname === "/portal/notificaciones" ? 0 : unread,
  };

  return (
    <nav aria-label="Secciones del portal">
      <ul className="grid grid-cols-3 gap-1 rounded-3xl bg-white p-1 shadow-soft ring-1 ring-forest/5 lg:flex lg:flex-wrap lg:rounded-full">
        {LINKS.map(({ href, label, short, icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                title={label}
                className={`relative flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] leading-tight transition-colors sm:text-xs lg:flex-row lg:gap-2 lg:rounded-full lg:px-3 lg:text-sm lg:whitespace-nowrap ${
                  active ? "bg-forest text-cream" : "text-forest hover:bg-peach-soft"
                }`}
              >
                <Icon name={icon} className="h-5 w-5 lg:h-4 lg:w-4" />
                <span className="max-w-full truncate">{short}</span>
                {(badges[href] ?? 0) > 0 && <Badge count={badges[href]} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
