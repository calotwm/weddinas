import Link from "next/link";
import { Icon } from "@/components/icons";
import { requireAdmin } from "@/server/auth";
import { welcomeTemplate } from "@/server/container";
import { siteOrigin } from "@/server/site-url";
import { WelcomeTemplateForm } from "../../forms";

export const dynamic = "force-dynamic";

export default async function WelcomeMessagePage() {
  await requireAdmin();
  const [template, origin] = await Promise.all([welcomeTemplate(), siteOrigin()]);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-forest/70 hover:text-forest">
          ← Parejas
        </Link>
        <p className="eyebrow mt-3">Panel del equipo</p>
        <h1 className="mt-1 font-display text-4xl text-forest sm:text-5xl">Mensaje de bienvenida</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink/65">
          <Icon name="share" className="mr-1 inline h-4 w-4 align-[-2px]" />
          Es el texto que les mandás a los novios cuando les compartís el portal por primera vez. Usá las etiquetas para que se completen solas con sus nombres, el link y su código.
        </p>
      </div>
      <div className="card">
        <WelcomeTemplateForm template={template} origin={origin} />
      </div>
    </div>
  );
}
