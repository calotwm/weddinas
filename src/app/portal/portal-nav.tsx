"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

// `short` is the label for phones, where all five tabs share one row.
const LINKS: Array<{ href: string; label: string; short: string; icon: IconName }> = [
  { href: "/portal", label: "Resumen", short: "Resumen", icon: "home" },
  { href: "/portal/propuestas", label: "Propuestas", short: "Propuestas", icon: "sparkle" },
  { href: "/portal/reportes", label: "Reportes", short: "Reportes", icon: "file" },
  { href: "/portal/checklist", label: "Checklist", short: "Checklist", icon: "checklist" },
  { href: "/portal/mi-pagina", label: "Nuestra página", short: "Página", icon: "edit" },
];

export function PortalNav({ pendingProposals }: { pendingProposals: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones del portal">
      <ul className="grid grid-cols-5 gap-1 rounded-3xl bg-white p-1 shadow-soft ring-1 ring-forest/5 sm:flex sm:w-max sm:rounded-full">
        {LINKS.map(({ href, label, short, icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] leading-tight transition-colors sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:text-sm sm:whitespace-nowrap ${
                  active ? "bg-forest text-cream" : "text-forest hover:bg-peach-soft"
                }`}
              >
                <Icon name={icon} className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="max-w-full truncate sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
                {href === "/portal/propuestas" && pendingProposals > 0 && (
                  <span className="absolute top-1 right-1 rounded-full bg-rust px-1.5 text-[11px] leading-5 font-semibold text-white sm:static">
                    {pendingProposals}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
