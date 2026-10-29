import Link from "next/link";
import { TopBar } from "@/components/brand";
import { Icon } from "@/components/icons";
import { requireAdmin } from "@/server/auth";
import { logout } from "../../actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-sand/40">
      <TopBar label="Panel del equipo">
        <Link href="/admin" className="btn-ghost btn-sm">
          <Icon name="users" className="h-3.5 w-3.5" />
          Parejas
        </Link>
        <form action={logout}>
          <button className="btn-ghost btn-sm" aria-label="Cerrar sesión">
            <Icon name="logout" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </form>
      </TopBar>
      <main className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6">{children}</main>
    </div>
  );
}
