"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

const SECTIONS: Array<{ href: string; label: string; icon: IconName; match: (path: string) => boolean }> = [
  { href: "/admin", label: "Parejas", icon: "users", match: (p) => p === "/admin" || p.startsWith("/admin/parejas") || p === "/admin/mensaje" },
  { href: "/admin/proveedores", label: "Proveedores", icon: "sparkle", match: (p) => p.startsWith("/admin/proveedores") },
  { href: "/admin/pagos", label: "Pagos", icon: "dollar", match: (p) => p.startsWith("/admin/pagos") },
  { href: "/admin/invitados", label: "Invitados", icon: "list", match: (p) => p.startsWith("/admin/invitados") },
  { href: "/admin/civil", label: "Civil", icon: "file", match: (p) => p.startsWith("/admin/civil") },
  { href: "/admin/pendientes", label: "Pendientes", icon: "bell", match: (p) => p.startsWith("/admin/pendientes") },
];

/** Top menu of the team panel; on phones the six sections share one row as icon + short label. */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones del panel" className="border-b border-forest/8 bg-white/80">
      <ul className="mx-auto grid max-w-6xl grid-cols-6 gap-1 px-2 py-1.5 sm:flex sm:gap-2 sm:px-6">
        {SECTIONS.map(({ href, label, icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[11px] leading-tight transition-colors sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:py-2 sm:text-sm ${
                  active ? "bg-forest text-cream" : "text-forest hover:bg-peach-soft"
                }`}
              >
                <Icon name={icon} className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
