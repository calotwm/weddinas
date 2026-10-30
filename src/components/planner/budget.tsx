import { categoryName } from "@/core/brief-catalog";
import { summarizeBudget, summarizeItem } from "@/core/budget";
import type { Budget, BudgetItem, Payment, PaymentKind } from "@/core/couple";
import type { IpcSeries, UsdQuote } from "@/core/money";
import { formatDay, formatMoney, formatMonth } from "@/lib/format";
import { Icon } from "../icons";

export const PAYMENT_KIND: Record<PaymentKind, string> = {
  sena: "Seña",
  saldo: "Saldo",
  adicional: "Adicional",
  iva: "IVA",
};

const money = (value: number | null, currency: "ARS" | "USD") => (value === null ? "—" : formatMoney(value, currency));

export function RatesNote({ ipc, quote }: { ipc: IpcSeries | null; quote: UsdQuote | null }) {
  const lastIpc = ipc?.points.at(-1)?.month;
  return (
    <p className="hint flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="inline-flex items-center gap-1.5">
        <Icon name="sparkle" className="h-3.5 w-3.5" />
        {quote ? `Dólar ${quote.label.toLowerCase()}: ${formatMoney(quote.sell, "ARS")}` : "Cotización del dólar no disponible"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Icon name="calendar" className="h-3.5 w-3.5" />
        {lastIpc ? `Último IPC publicado (INDEC): ${formatMonth(lastIpc)}` : "IPC no disponible: saldos sin ajustar"}
      </span>
    </p>
  );
}

export function BudgetOverview({ budget, ipc, quote }: { budget: Budget; ipc: IpcSeries | null; quote: UsdQuote | null }) {
  const s = summarizeBudget(budget.items, ipc, quote?.sell ?? null);
  const perGuest = budget.guests && s.totalUsd !== null ? s.totalUsd / budget.guests : null;
  const stats = [
    { label: "Total estimado", ars: s.totalArs, usd: s.totalUsd, tone: "text-forest" },
    { label: "Ya pagado", ars: s.paidArs, usd: s.paidUsd, tone: "text-teal" },
    { label: "Falta pagar", ars: s.pendingArs, usd: s.pendingUsd, tone: "text-rust" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="card !p-5">
            <p className="label">{stat.label}</p>
            <p className={`font-display text-3xl ${stat.tone}`}>{money(stat.usd, "USD")}</p>
            <p className="text-sm text-ink/60">{money(stat.ars, "ARS")}</p>
          </div>
        ))}
      </div>
      {perGuest !== null && (
        <p className="text-sm text-ink/70">
          {budget.guests} invitados · costo por invitado aprox. <strong className="text-forest">{formatMoney(perGuest, "USD")}</strong>
        </p>
      )}

      {s.categories.length > 0 && (
        <div className="card overflow-hidden !p-0">
          <table className="w-full text-sm">
            <thead className="bg-sand/60 text-left text-xs tracking-wider text-ink/60 uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold sm:px-6">Rubro</th>
                <th className="hidden px-4 py-3 text-right font-semibold sm:table-cell">Total</th>
                <th className="px-4 py-3 text-right font-semibold">Pagado</th>
                <th className="px-4 py-3 text-right font-semibold sm:px-6">Falta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forest/5">
              {s.categories.map((c) => {
                const pct = c.totalArs && c.paidArs !== null ? Math.min(100, Math.round((c.paidArs / c.totalArs) * 100)) : 0;
                return (
                  <tr key={c.category}>
                    <td className="px-4 py-3 sm:px-6">
                      <p className="font-semibold text-forest">{categoryName(c.category)}</p>
                      <div className="mt-1.5 h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-sand" aria-label={`${pct}% pagado`}>
                        <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-right whitespace-nowrap sm:table-cell">{money(c.totalArs, "ARS")}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-teal">{money(c.paidArs, "ARS")}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-rust sm:px-6">{money(c.pendingArs, "ARS")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function BudgetItemCard({
  item,
  ipc,
  paymentAction,
  children,
}: {
  item: BudgetItem;
  ipc: IpcSeries | null;
  /** Optional control rendered next to each payment (admin delete button). */
  paymentAction?: (payment: Payment) => React.ReactNode;
  children?: React.ReactNode;
}) {
  const s = summarizeItem(item, ipc);
  const adjusted = item.currency === "ARS" && item.adjustment === "ipc";

  return (
    <article className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-rust uppercase">{categoryName(item.category)}</p>
          <h3 className="font-display text-2xl text-forest">{item.vendor || "Sin proveedor"}</h3>
          {item.concept && <p className="text-sm text-ink/70">{item.concept}</p>}
        </div>
        <div className="text-right">
          <p className="font-display text-2xl text-forest">{formatMoney(s.total, item.currency)}</p>
          <p className="text-xs text-ink/50">
            {adjusted ? "Saldo ajustado por IPC" : item.currency === "USD" ? "En dólares" : "Monto congelado"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-mint/15 px-4 py-3">
          <p className="label !mb-0.5">Pagado</p>
          <p className="font-semibold text-forest">{formatMoney(s.paid, item.currency)}</p>
        </div>
        <div className="rounded-2xl bg-peach-soft px-4 py-3">
          <p className="label !mb-0.5">Falta pagar</p>
          <p className="font-semibold text-rust">{formatMoney(s.pending, item.currency)}</p>
          {adjusted && s.pending !== s.pendingNominal && (
            <p className="text-xs text-ink/55">
              {formatMoney(s.pendingNominal, "ARS")} de {formatMonth(item.baseMonth)} + IPC
            </p>
          )}
        </div>
      </div>

      {item.note && <p className="text-sm text-ink/70">{item.note}</p>}

      {item.payments.length > 0 && (
        <ul className="divide-y divide-forest/5 rounded-2xl ring-1 ring-forest/10">
          {item.payments.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="chip bg-sand text-ink/70">{PAYMENT_KIND[p.kind]}</span>
              <span className="text-ink/60">{formatDay(p.date)}</span>
              <span className="ml-auto text-right">
                <span className="font-semibold text-forest">{formatMoney(p.amount, p.currency)}</span>
                {p.arsPerUsd && <span className="block text-xs text-ink/50">a {formatMoney(p.arsPerUsd, "ARS")} por dólar</span>}
                {p.note && <span className="block text-xs text-ink/50">{p.note}</span>}
              </span>
              {paymentAction?.(p)}
            </li>
          ))}
        </ul>
      )}

      {children}
    </article>
  );
}
