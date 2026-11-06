"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

const TABS: Array<{ path: string; label: string; icon: IconName }> = [
  { path: "", label: "General", icon: "home" },
  { path: "/brief", label: "Brief", icon: "file" },
  { path: "/presupuesto", label: "Pagos", icon: "dollar" },
  { path: "/checklist", label: "Checklist", icon: "checklist" },
  { path: "/musica", label: "Música", icon: "music" },
  { path: "/familia", label: "Familia", icon: "heart" },
  { path: "/estetica", label: "Estética", icon: "edit" },
  { path: "/timing", label: "Timing", icon: "clock" },
  { path: "/invitados", label: "Invitados", icon: "list" },
];

export function CoupleTabs({ coupleId }: { coupleId: string }) {
  const pathname = usePathname();
  const base = `/admin/parejas/${coupleId}`;

  return (
    <nav aria-label="Secciones de la pareja">
      <ul className="grid grid-cols-3 gap-1 rounded-3xl bg-white p-1 shadow-soft ring-1 ring-forest/5 sm:grid-cols-5 lg:flex lg:w-max lg:max-w-full lg:flex-wrap lg:rounded-full">
        {TABS.map(({ path, label, icon }) => {
          const href = base + path;
          const active = pathname === href;
          return (
            <li key={path} className="min-w-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] leading-tight transition-colors sm:text-xs lg:flex-row lg:gap-2 lg:rounded-full lg:px-4 lg:text-sm ${
                  active ? "bg-forest text-cream" : "text-forest hover:bg-peach-soft"
                }`}
              >
                <Icon name={icon} className="h-5 w-5 lg:h-4 lg:w-4" />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
