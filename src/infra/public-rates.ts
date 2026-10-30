import type { IpcSeries, UsdQuote } from "@/core/money";
import type { RatesProvider } from "@/core/ports";

const IPC_URL =
  "https://apis.datos.gob.ar/series/api/series/?ids=148.3_INIVELNAL_DICI_M_26&limit=1000&sort=desc&format=json";
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

/** INDEC IPC via datos.gob.ar and dollar quotes via dolarapi.com. */
export class PublicRatesProvider implements RatesProvider {
  private readonly loadIpc = cached(12 * HOUR, async (): Promise<IpcSeries> => {
    const body = (await getJson(IPC_URL)) as { data: Array<[string, number | null]> };
    const points = body.data
      .filter((row): row is [string, number] => typeof row[1] === "number")
      .map(([date, value]) => ({ month: date.slice(0, 7), value }))
      .sort((a, b) => a.month.localeCompare(b.month));
    if (points.length === 0) throw new Error("empty IPC series");
    return { points };
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
