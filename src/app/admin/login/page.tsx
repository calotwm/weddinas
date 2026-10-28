import { Logo } from "@/components/brand";
import { AdminLoginForm } from "../forms";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-forest px-4">
      <div className="w-full max-w-sm text-center">
        <Logo light className="mx-auto mb-6 h-14" />
        <p className="mb-6 font-script text-4xl text-peach">Equipo Weddinas</p>
        <div className="card text-left">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
