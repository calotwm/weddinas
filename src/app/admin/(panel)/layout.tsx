import Link from "next/link";
import { TopBar } from "@/components/brand";
import { requireAdmin } from "@/server/auth";
import { logout } from "../../actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <TopBar>
        <Link href="/admin" className="text-forest hover:underline">Parejas</Link>
        <form action={logout}>
          <button className="btn-ghost px-4 py-1.5 text-xs">Salir</button>
        </form>
      </TopBar>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
