import Link from "next/link";
import { TopBar } from "@/components/brand";
import { Icon } from "@/components/icons";
import { MadeBy } from "@/components/made-by";
import { currentTeamUser, requireAdmin } from "@/server/auth";
import { logout } from "../../actions";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const user = await currentTeamUser();

  return (
    <div className="min-h-screen bg-sand/40">
      <TopBar label="Panel del equipo">
        {user && (
          <Link href="/admin/cuenta" className="btn-light btn-sm" aria-label="Mi cuenta">
            <Icon name="key" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mi cuenta</span>
          </Link>
        )}
        <form action={logout}>
          <button className="btn-light btn-sm" aria-label="Cerrar sesión">
            <Icon name="logout" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </form>
      </TopBar>
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 pt-8 pb-10 sm:px-6">{children}</main>
      <MadeBy light={false} className="pb-8" />
    </div>
  );
}
