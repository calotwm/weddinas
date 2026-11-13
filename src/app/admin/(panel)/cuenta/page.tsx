import { currentTeamUser, requireAdmin } from "@/server/auth";
import { ChangePasswordForm } from "../../forms";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  await requireAdmin();
  const user = await currentTeamUser();
  return (
    <div className="card mx-auto max-w-md">
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
  );
}
