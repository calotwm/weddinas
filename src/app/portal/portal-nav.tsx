"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

// `short` is the visible label (eleven sections must fit one row on desktop); `label` is the full name shown on hover.
// The guest web page (/portal/mi-pagina) is no longer linked: "Estética" replaced it.
const LINKS: Array<{ href: string; label: string; short: string; icon: IconName }> = [
  { href: "/portal", label: "Resumen", short: "Resumen", icon: "home" },
  { href: "/portal/propuestas", label: "Propuestas", short: "Propuestas", icon: "sparkle" },
  { href: "/portal/proveedores", label: "Proveedores", short: "Proveedores", icon: "users" },
  { href: "/portal/presupuesto", label: "Presupuesto", short: "Presupuesto", icon: "dollar" },
  { href: "/portal/notificaciones", label: "Notificaciones", short: "Notificaciones", icon: "bell" },
  { href: "/portal/checklist", label: "Temas del mes", short: "Temas del mes", icon: "checklist" },
  { href: "/portal/musica", label: "Música", short: "Música", icon: "music" },
  { href: "/portal/familia", label: "Fotos familiares", short: "Familia", icon: "heart" },
  { href: "/portal/estetica", label: "Estética", short: "Estética", icon: "edit" },
  { href: "/portal/timing", label: "Timing del día", short: "Timing", icon: "clock" },
  { href: "/portal/invitados", label: "Lista de invitados", short: "Invitados", icon: "list" },
];

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute top-1 right-1.5 rounded-full bg-rust px-1.5 text-[11px] leading-5 font-semibold text-white">
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
      <ul className="grid grid-cols-4 gap-1 rounded-3xl bg-white p-1 shadow-soft ring-1 ring-forest/5 sm:grid-cols-6 lg:grid-cols-11">
        {LINKS.map(({ href, label, short, icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                title={label}
                className={`relative flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] leading-tight transition-colors sm:text-xs lg:text-[11px] xl:text-xs ${
                  active ? "bg-forest text-cream" : "text-forest hover:bg-peach-soft"
                }`}
              >
                <Icon name={icon} className="h-5 w-5" />
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
