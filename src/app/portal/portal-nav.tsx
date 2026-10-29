"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

const LINKS: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/portal", label: "Resumen", icon: "home" },
  { href: "/portal/propuestas", label: "Propuestas", icon: "sparkle" },
  { href: "/portal/reportes", label: "Reportes", icon: "file" },
  { href: "/portal/checklist", label: "Checklist", icon: "checklist" },
  { href: "/portal/mi-pagina", label: "Nuestra página", icon: "edit" },
];

export function PortalNav({ pendingProposals }: { pendingProposals: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones del portal" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 rounded-full bg-white p-1 shadow-soft ring-1 ring-forest/5">
        {LINKS.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors ${
                  active ? "bg-forest text-cream" : "text-forest hover:bg-peach-soft"
                }`}
              >
                <Icon name={icon} className="h-4 w-4" />
                {label}
                {href === "/portal/propuestas" && pendingProposals > 0 && (
                  <span className="rounded-full bg-rust px-1.5 text-[11px] leading-5 font-semibold text-white">
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
