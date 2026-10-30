"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

const TABS: Array<{ path: string; label: string; icon: IconName }> = [
  { path: "", label: "General", icon: "home" },
  { path: "/brief", label: "Brief", icon: "file" },
  { path: "/presupuesto", label: "Pagos", icon: "gift" },
  { path: "/musica", label: "Música", icon: "sparkle" },
  { path: "/familia", label: "Familia", icon: "users" },
];

export function CoupleTabs({ coupleId }: { coupleId: string }) {
  const pathname = usePathname();
  const base = `/admin/parejas/${coupleId}`;

  return (
    <nav aria-label="Secciones de la pareja">
      <ul className="grid grid-cols-5 gap-1 rounded-3xl bg-white p-1 shadow-soft ring-1 ring-forest/5 sm:flex sm:w-max sm:rounded-full">
        {TABS.map(({ path, label, icon }) => {
          const href = base + path;
          const active = pathname === href;
          return (
            <li key={path} className="min-w-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] leading-tight transition-colors sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:text-sm ${
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
