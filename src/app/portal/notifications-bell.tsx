"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";

/** Header bell next to "Salir": opens Notificaciones and shows the unread count (gone once they are open). */
export function NotificationsBell({ unread }: { unread: number }) {
  const pathname = usePathname();
  const active = pathname === "/portal/notificaciones";
  const count = active ? 0 : unread;
  const label = count > 0 ? `Notificaciones (${count} sin leer)` : "Notificaciones";

  return (
    <Link href="/portal/notificaciones" aria-label={label} title={label} aria-current={active ? "page" : undefined} className="btn-light btn-sm relative">
      <Icon name="bell" className="h-3.5 w-3.5" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full bg-rust px-1.5 text-center text-[11px] leading-5 font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
