import { extendIpc, type IpcSeries, type UsdQuote } from "@/core/money";
import type { RatesProvider } from "@/core/ports";

const IPC_URL =
  "https://apis.datos.gob.ar/series/api/series/?ids=148.3_INIVELNAL_DICI_M_26&limit=1000&sort=desc&format=json";
const LATEST_IPC_URL = "https://api.argly.com.ar/v1/ipc";
const USD_URL = "https://dolarapi.com/v1/dolares";

const HOUR = 3_600_000;

/** Caches each value in memory; a failed refresh keeps serving the last good value. */
function cached<T>(ttlMs: number, load: () => Promise<T>): () => Promise<T | null> {
  let value: T | null = null;
  let fetchedAt = 0;
  return async () => {
    if (value !== null && Date.now() - fetchedAt < ttlMs) return value;
    try {
      value = await load();
      fetchedAt = Date.now();
    } catch {
      // Keep the stale value (or null) when the public API is down.
    }
    return value;
  };
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

/** Latest published monthly IPC variation from argly.com.ar, usually a few weeks ahead of datos.gob.ar. */
async function latestVariation(): Promise<{ month: string; variationPct: number } | null> {
  const body = (await getJson(LATEST_IPC_URL)) as { data?: { indice_ipc?: number; mes?: number; anio?: number } };
  const { indice_ipc: pct, mes, anio } = body.data ?? {};
  if (typeof pct !== "number" || typeof mes !== "number" || typeof anio !== "number") return null;
  return { month: `${anio}-${String(mes).padStart(2, "0")}`, variationPct: pct };
}

/** INDEC IPC via datos.gob.ar (index levels) plus argly (latest month), and dollar quotes via dolarapi.com. */
export class PublicRatesProvider implements RatesProvider {
  private readonly loadIpc = cached(12 * HOUR, async (): Promise<IpcSeries> => {
    const [body, latest] = await Promise.all([
      getJson(IPC_URL) as Promise<{ data: Array<[string, number | null]> }>,
      latestVariation().catch(() => null),
    ]);
    const points = body.data
      .filter((row): row is [string, number] => typeof row[1] === "number")
      .map(([date, value]) => ({ month: date.slice(0, 7), value }))
      .sort((a, b) => a.month.localeCompare(b.month));
    if (points.length === 0) throw new Error("empty IPC series");
    return latest ? extendIpc({ points }, latest) : { points };
  });

  private readonly loadUsd = cached(HOUR / 2, async (): Promise<UsdQuote[]> => {
    const body = (await getJson(USD_URL)) as Array<{ casa: string; nombre: string; venta: number; fechaActualizacion: string }>;
    return body
      .filter((q) => typeof q.venta === "number" && q.venta > 0)
      .map((q) => ({ kind: q.casa, label: q.nombre, sell: q.venta, updatedAt: q.fechaActualizacion }));
  });

  ipc(): Promise<IpcSeries | null> {
    return this.loadIpc();
  }

  async usdQuotes(): Promise<UsdQuote[]> {
    return (await this.loadUsd()) ?? [];
  }
}
