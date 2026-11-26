import Link from "next/link";
import { linkedSongs, showsStationery } from "@/core/brief-links";
import type { Music } from "@/core/couple";
import { photoUrl } from "./family";

/**
 * What a brief rubro takes from other tabs: the DJ and the shows show the Música songs, Papelería the designs uploaded
 * in Estética. Read-only here; each list links to the tab where it is edited.
 */
export function BriefLinks({
  coupleId,
  blockKey,
  music,
  stationeryIds,
  musicHref,
  aestheticHref,
}: {
  coupleId: string;
  blockKey: string;
  music: Music;
  stationeryIds: string[];
  musicHref: string;
  aestheticHref: string;
}) {
  const songs = linkedSongs(blockKey, music);
  const designs = showsStationery(blockKey) ? stationeryIds : null;
  if (!songs && !designs) return null;

  return (
    <div className="space-y-2 rounded-2xl bg-cream/70 p-4 ring-1 ring-forest/5 print:hidden">
      {songs && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-forest">Canciones (desde Música)</p>
            <Link href={musicHref} className="text-sm text-teal underline">Ir a Música</Link>
          </div>
          {songs.length === 0 ? (
            <p className="text-sm text-ink/50">Todavía no hay canciones cargadas.</p>
          ) : (
            songs.map((g) => (
              <div key={g.group}>
                <p className="text-xs font-semibold tracking-[0.2em] text-rust uppercase">{g.group}</p>
                <ul className="mt-1 space-y-1">
                  {g.songs.map((s) => (
                    <li key={s.label} className="text-sm text-ink">
                      <span className="font-medium">{s.label}:</span> <span className="whitespace-pre-line">{s.song}</span>{" "}
                      <span className={`chip ${s.status === "chosen" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {s.status === "chosen" ? "Elegida" : "Pendiente"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </>
      )}
      {designs && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-forest">Diseños (desde Estética)</p>
            <Link href={aestheticHref} className="text-sm text-teal underline">Ir a Estética</Link>
          </div>
          {designs.length === 0 ? (
            <p className="text-sm text-ink/50">Todavía no hay diseños cargados.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {designs.map((id) => (
                <li key={id}>
                  <a href={photoUrl(coupleId, id)} target="_blank" rel="noreferrer">
                    {id.endsWith(".pdf") ? (
                      <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-white text-sm font-semibold text-forest ring-1 ring-forest/10">PDF</span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- couple files are served by our own route, not next/image
                      <img src={photoUrl(coupleId, id)} alt="Elemento gráfico" loading="lazy" className="h-20 w-20 rounded-xl object-cover ring-1 ring-forest/10" />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
