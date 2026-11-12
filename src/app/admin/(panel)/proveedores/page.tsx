import Link from "next/link";
import { Icon } from "@/components/icons";
import { StatusChip } from "@/components/planner/brief";
import { coupleNames, type BriefBlock, type CoupleView as Couple } from "@/core/couple";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

export const dynamic = "force-dynamic";

type Filters = { q?: string; rubro?: string };

interface VendorRow {
  couple: Couple;
  block: BriefBlock;
}

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function VendorsAdminPage({ searchParams }: { searchParams: Promise<Filters> }) {
  await requireAdmin();
  const filters = await searchParams;
  const query = normalize((filters.q ?? "").trim());

  const couples = (await portal.listCouples()).sort((a, b) => a.weddingDate.localeCompare(b.weddingDate));
  const all: VendorRow[] = couples.flatMap((couple) =>
    couple.brief.filter((block) => block.kind === "vendor" && block.vendor.trim()).map((block) => ({ couple, block })),
  );

  const categories = [...new Map(all.map(({ block }) => [block.key, block.name])).entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));

  const visible = all.filter(
    ({ couple, block }) =>
      (!filters.rubro || block.key === filters.rubro) &&
      (!query || [block.vendor, block.contact, block.name, coupleNames(couple)].some((text) => normalize(text).includes(query))),
  );

  // Grouped by rubro key, so a custom rubro ("Fuegos artificiales") of any wedding gets its own group under one name.
  const rubroName = new Map(categories);
  const groups = new Map<string, VendorRow[]>();
  for (const row of visible) {
    const name = rubroName.get(row.block.key) ?? row.block.name;
    groups.set(name, [...(groups.get(name) ?? []), row]);
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  const filtered = Boolean(query || filters.rubro);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Panel del equipo</p>
        <h1 className="mt-1 font-display text-4xl text-forest sm:text-5xl">Proveedores</h1>
        <p className="mt-2 text-sm text-ink/60">Los proveedores cargados en el brief de todas las parejas, agrupados por rubro.</p>
      </div>

      <form className="card flex flex-wrap items-end gap-3 p-4 sm:p-5">
        <label className="relative min-w-52 flex-1">
          <span className="sr-only">Buscar proveedor</span>
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input type="search" name="q" defaultValue={filters.q ?? ""} placeholder="Buscar proveedor, contacto o pareja…" className="field py-2.5 pl-11" />
        </label>
        <div>
          <label htmlFor="rubro" className="sr-only">Rubro</label>
          <select id="rubro" name="rubro" defaultValue={filters.rubro ?? ""} className="field !py-2.5">
            <option value="">Todos los rubros</option>
            {categories.map(([key, name]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary btn-sm">Buscar</button>
          {filtered && <Link href="/admin/proveedores" className="btn-ghost btn-sm">Limpiar</Link>}
        </div>
      </form>

      {sortedGroups.length === 0 ? (
        <p className="card py-10 text-center text-ink/50">
          {filtered ? "Ningún proveedor coincide con la búsqueda." : "Todavía no hay proveedores cargados en los briefs."}
        </p>
      ) : (
        sortedGroups.map(([name, rows]) => (
          <section key={name} className="card p-0 sm:p-0">
            <h2 className="flex items-center justify-between gap-2 border-b border-forest/8 p-4 font-semibold text-forest sm:px-5">
              {name}
              <span className="chip bg-sand text-ink/60">{rows.length}</span>
            </h2>
            <ul className="divide-y divide-forest/6">
              {rows.map(({ couple, block }) => (
                <li key={`${couple.id}-${block.key}`} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1.2fr_1fr_auto_1fr] sm:items-center sm:gap-4 sm:px-5">
                  <p className="font-semibold text-forest">{block.vendor}</p>
                  <Link href={`/admin/parejas/${couple.id}/brief`} className="text-ink/75 underline-offset-4 hover:text-forest hover:underline">
                    {coupleNames(couple)}
                  </Link>
                  <span><StatusChip status={block.status} /></span>
                  <p className="break-words text-ink/65">{block.contact || <span className="text-ink/35">Sin contacto</span>}</p>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
