import { currentTeamUser, requireAdmin } from "@/server/auth";
import { ChangePasswordForm } from "../../forms";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  await requireAdmin();
  const user = await currentTeamUser();
  return (
    <div className="mx-auto grid max-w-md gap-6">
      <div className="card">
        <h2 className="section-title">Mi cuenta</h2>
        {user ? (
          <>
            <p className="mb-6 text-sm text-ink/70">Entraste como <span className="font-semibold text-forest">{user}</span>.</p>
            <ChangePasswordForm />
          </>
        ) : (
          <p className="text-sm text-ink/70">Entraste con el código compartido del equipo. Para cambiar tu clave, entrá con tu mail.</p>
        )}
      </div>
      <div className="card">
        <h2 className="section-title">Backup</h2>
        <p className="mb-4 text-sm text-ink/70">Descargá una copia de los datos de todas las parejas. Las fotos subidas no se incluyen.</p>
        <a href="/admin/backup" download className="btn-primary w-full py-3 text-center">Descargar backup</a>
      </div>
    </div>
  );
}
