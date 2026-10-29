"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";

export interface CoupleRow {
  id: string;
  slug: string;
  names: string;
  date: string;
  days: number;
  isPast: boolean;
  pending: number;
  progress: number;
}

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function DaysChip({ row }: { row: CoupleRow }) {
  if (row.isPast) return <span className="chip bg-ink/8 text-ink/60">Ya fue</span>;
  const tone = row.days <= 30 ? "bg-rust/10 text-rust" : row.days <= 90 ? "bg-peach text-forest" : "bg-mint/20 text-forest";
  return <span className={`chip ${tone}`}>{row.days === 0 ? "¡Hoy!" : `${row.days} días`}</span>;
}

export function CoupleList({ rows }: { rows: CoupleRow[] }) {
  const [query, setQuery] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return rows.filter(
      (r) => (showPast || !r.isPast) && (!onlyPending || r.pending > 0) && (!q || normalize(r.names).includes(q)),
    );
  }, [rows, query, onlyPending, showPast]);

  const pastCount = rows.filter((r) => r.isPast).length;

  return (
    <div className="card p-0 sm:p-0">
      <div className="flex flex-wrap items-center gap-3 border-b border-forest/8 p-4 sm:p-5">
        <label className="relative min-w-52 flex-1">
          <span className="sr-only">Buscar pareja</span>
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre…"
            className="field py-2.5 pl-11"
          />
        </label>
        <button
          type="button"
          aria-pressed={onlyPending}
          onClick={() => setOnlyPending((v) => !v)}
          className={`chip cursor-pointer py-2 transition-colors ${onlyPending ? "bg-rust text-white" : "bg-peach-soft text-rust hover:bg-peach"}`}
        >
          Con propuestas pendientes
        </button>
        {pastCount > 0 && (
          <button
            type="button"
            aria-pressed={showPast}
            onClick={() => setShowPast((v) => !v)}
            className={`chip cursor-pointer py-2 transition-colors ${showPast ? "bg-forest text-cream" : "bg-sand text-forest hover:bg-peach-soft"}`}
          >
            Mostrar pasadas ({pastCount})
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="px-5 py-10 text-center text-ink/50">
          {rows.length === 0 ? "Todavía no hay parejas cargadas. Creá la primera desde el formulario." : "Ninguna pareja coincide con el filtro."}
        </p>
      ) : (
        <ul className="divide-y divide-forest/6">
          {visible.map((r) => (
            <li key={r.id} className="group relative flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 transition-colors hover:bg-peach-soft/50 sm:px-5">
              <div className="min-w-48 flex-1">
                <Link href={`/admin/parejas/${r.id}`} className="font-display text-xl text-forest after:absolute after:inset-0">
                  {r.names}
                </Link>
                <p className="text-sm text-ink/55">{r.date}</p>
              </div>
              <DaysChip row={r} />
              <div className="hidden w-28 sm:block" title={`Checklist ${r.progress}%`}>
                <div className="h-1.5 overflow-hidden rounded-full bg-sand">
                  <div className="h-full rounded-full bg-teal" style={{ width: `${r.progress}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-ink/50">Checklist {r.progress}%</p>
              </div>
              <span className={`chip ${r.pending ? "bg-peach text-rust" : "bg-transparent text-ink/35"}`}>
                {r.pending ? `${r.pending} pendiente${r.pending > 1 ? "s" : ""}` : "Sin pendientes"}
              </span>
              <Link
                href={`/boda/${r.slug}`}
                target="_blank"
                aria-label={`Ver página de ${r.names}`}
                className="btn-icon relative z-10 hover:text-teal"
              >
                <Icon name="external" className="h-4 w-4" />
              </Link>
              <Icon name="arrowRight" className="h-4 w-4 text-forest/30 transition-transform group-hover:translate-x-1 group-hover:text-forest" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
