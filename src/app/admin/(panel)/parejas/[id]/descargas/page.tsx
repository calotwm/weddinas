import Link from "next/link";
import { Icon } from "@/components/icons";
import { DOWNLOAD_SHEETS, downloadsPath } from "@/components/print/sheets";
import { sheetCouple } from "./data";

export const dynamic = "force-dynamic";

export default async function DownloadsAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const couple = await sheetCouple(params);
  const base = downloadsPath(couple.id);
  const vendors = couple.brief.filter((b) => b.kind === "vendor" && b.status === "confirmed");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-forest">Descargas</h2>
        <p className="hint">Abrí la hoja y tocá &quot;Descargar PDF&quot;; en la ventana de impresión elegí &quot;Guardar como PDF&quot;.</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DOWNLOAD_SHEETS.map((sheet) => (
          <li key={sheet.slug}>
            <Link href={`${base}/${sheet.slug}`} className="card flex h-full gap-4 !p-5 transition-shadow hover:shadow-md">
              <span className="icon-badge">
                <Icon name="file" className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-xl text-forest">{sheet.title}</span>
                <span className="block text-sm text-ink/70">{sheet.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {vendors.length > 0 && (
        <section className="card space-y-3">
          <div>
            <h3 className="section-title">Cada proveedor por separado</h3>
            <p className="hint">La hoja de un solo proveedor confirmado, para mandársela.</p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {vendors.map((block) => (
              <li key={block.key}>
                <Link href={`${base}/proveedores?rubro=${encodeURIComponent(block.key)}`} className="btn-ghost btn-sm">
                  <Icon name="file" className="h-3.5 w-3.5" />
                  {block.name}
                  {block.vendor && <span className="text-ink/55">· {block.vendor}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
