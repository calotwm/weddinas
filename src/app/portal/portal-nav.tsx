"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/portal", label: "Resumen" },
  { href: "/portal/propuestas", label: "Propuestas" },
  { href: "/portal/reportes", label: "Reportes" },
  { href: "/portal/checklist", label: "Checklist" },
  { href: "/portal/mi-pagina", label: "Nuestra página" },
];

export function PortalNav({ pendingProposals }: { pendingProposals: number }) {
  const pathname = usePathname();

  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`shrink-0 rounded-full px-4 py-2 text-sm transition-colors ${
              active ? "bg-forest text-peach" : "bg-white text-forest hover:bg-peach-soft"
            }`}
          >
            {label}
            {href === "/portal/propuestas" && pendingProposals > 0 && (
              <span className="ml-2 rounded-full bg-rust px-2 py-0.5 text-xs text-white">{pendingProposals}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
