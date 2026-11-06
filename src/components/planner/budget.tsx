import Link from "next/link";
import { categoryName } from "@/core/brief-catalog";
import { dueItems, paidLast, summarizeBudget, summarizeItem } from "@/core/budget";
import type { Budget, BudgetItem, Payment, PaymentKind } from "@/core/couple";
import type { Currency, IpcSeries, UsdQuote } from "@/core/money";
import { addDays, formatDay, formatMoney, formatMonth } from "@/lib/format";
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

/** Categorical colors for the pie chart, in brand tones that stay apart from each other. */
const SLICE_COLORS = ["#2b635a", "#c6541a", "#0a8983", "#e3a25f", "#78c1b0", "#8a5a83", "#d9826b", "#4f7fa8", "#b8a14a", "#6b7d7a"];

export const categoryAnchor = (category: string) => `rubro-${category}`;

/** Fully paid items go last; the first card of each category gets the anchor the overview links to. */
export function orderedBudgetItems(items: BudgetItem[], ipc: IpcSeries | null): Array<{ item: BudgetItem; anchor?: string }> {
  const seen = new Set<string>();
  return paidLast(items, ipc).map((item) => {
    if (seen.has(item.category)) return { item };
    seen.add(item.category);
    return { item, anchor: categoryAnchor(item.category) };
  });
}

/** Payments due within a week, or already overdue. */
export function DueAlert({ items, ipc, today }: { items: BudgetItem[]; ipc: IpcSeries | null; today: string }) {
  const due = dueItems(items, ipc, today, addDays(today, 7));
  if (due.length === 0) return null;
  return (
    <div role="alert" className="flex gap-3 rounded-2xl bg-rust/10 p-4 ring-1 ring-rust/20">
      <Icon name="bell" className="mt-0.5 h-5 w-5 shrink-0 text-rust" />
      <div>
        <p className="font-semibold text-rust">{due.length === 1 ? "Hay un pago por realizar" : `Hay ${due.length} pagos por realizar`}</p>
        <ul className="mt-1 space-y-0.5 text-sm text-ink/80">
          {due.map(({ item, pending, overdue }) => (
            <li key={item.id}>
              <a href={`#${categoryAnchor(item.category)}`} className="font-semibold text-forest underline-offset-4 hover:underline">
                {item.vendor || categoryName(item.category)}
              </a>
              : {formatMoney(pending, item.currency)} · {overdue ? "venció el" : "vence el"} {formatDay(item.dueDate!)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CurrencySwitch({ currency }: { currency: Currency }) {
  return (
    <div role="group" aria-label="Moneda" className="inline-flex rounded-full bg-white p-1 text-sm ring-1 ring-forest/10">
      {(["ARS", "USD"] as const).map((c) => (
        <Link
          key={c}
          href={`?moneda=${c.toLowerCase()}`}
          scroll={false}
          aria-current={currency === c ? "true" : undefined}
          className={`rounded-full px-3 py-1 font-semibold ${currency === c ? "bg-forest text-cream" : "text-forest hover:bg-peach-soft"}`}
        >
          {c === "ARS" ? "$ Pesos" : "USD Dólares"}
        </Link>
      ))}
    </div>
  );
}

export const budgetCurrency = (moneda: string | string[] | undefined): Currency => (moneda === "ars" ? "ARS" : "USD");

export function BudgetOverview({
  budget,
  ipc,
  quote,
  currency = "USD",
}: {
  budget: Budget;
  ipc: IpcSeries | null;
  quote: UsdQuote | null;
  currency?: Currency;
}) {
  const s = summarizeBudget(budget.items, ipc, quote?.sell ?? null);
  const usd = currency === "USD";
  const other: Currency = usd ? "ARS" : "USD";
  const perGuest = budget.guests && s.totalUsd !== null ? s.totalUsd / budget.guests : null;
  const stats = [
    { label: "Total estimado", ars: s.totalArs, usd: s.totalUsd, tone: "text-forest" },
    { label: "Ya pagado", ars: s.paidArs, usd: s.paidUsd, tone: "text-teal" },
    { label: "Falta pagar", ars: s.pendingArs, usd: s.pendingUsd, tone: "text-rust" },
  ];
  const categories = s.categories.map((c, i) => ({
    category: c.category,
    color: SLICE_COLORS[i % SLICE_COLORS.length],
    total: usd ? c.totalUsd : c.totalArs,
    paid: usd ? c.paidUsd : c.paidArs,
    pending: usd ? c.pendingUsd : c.pendingArs,
  }));
  const grand = categories.reduce((sum, c) => sum + (c.total ?? 0), 0);
  const share = (total: number | null) => (grand ? Math.round(((total ?? 0) / grand) * 100) : 0);
  let angle = 0;
  const slices = categories.map((c) => {
    const from = angle;
    angle += grand ? ((c.total ?? 0) / grand) * 360 : 0;
    return `${c.color} ${from}deg ${angle}deg`;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/70">
          Montos en <strong className="text-forest">{usd ? "dólares (USD)" : "pesos ($)"}</strong>
        </p>
        <CurrencySwitch currency={currency} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="card !p-5">
            <p className="label">{stat.label}</p>
            <p className={`font-display text-3xl ${stat.tone}`}>{money(usd ? stat.usd : stat.ars, currency)}</p>
            <p className="text-sm text-ink/60">{money(usd ? stat.ars : stat.usd, other)}</p>
          </div>
        ))}
      </div>
      {perGuest !== null && (
        <p className="text-sm text-ink/70">
          {budget.guests} invitados · costo por invitado aprox. <strong className="text-forest">{formatMoney(perGuest, "USD")}</strong>
        </p>
      )}

      {categories.length > 0 && (
        <div className="card grid items-center gap-6 md:grid-cols-[13rem_1fr]">
          <div
            role="img"
            aria-label={`Presupuesto por rubro: ${categories.map((c) => `${categoryName(c.category)} ${share(c.total)}%`).join(", ")}`}
            className="mx-auto aspect-square w-44 rounded-full ring-1 ring-forest/10 md:w-full"
            style={{ background: grand ? `conic-gradient(${slices.join(", ")})` : "var(--color-sand)" }}
          />
          <div className="overflow-x-auto">
            <p className="mb-2 text-xs text-ink/55">Tocá un rubro para ver su desglose.</p>
            <table className="w-full text-sm">
              <thead className="text-left text-xs tracking-wider text-ink/60 uppercase">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Rubro</th>
                  <th className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Total</th>
                  <th className="px-3 py-2 text-right font-semibold">Pagado</th>
                  <th className="py-2 pl-3 text-right font-semibold">Falta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest/5">
                {categories.map((c) => {
                  const pct = c.total && c.paid !== null ? Math.min(100, Math.round((c.paid / c.total) * 100)) : 0;
                  return (
                    <tr key={c.category}>
                      <td className="py-2.5 pr-3">
                        <a href={`#${categoryAnchor(c.category)}`} className="group inline-flex items-center gap-2 font-semibold text-forest">
                          <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
                          <span className="underline-offset-4 group-hover:underline">{categoryName(c.category)}</span>
                          <span className="text-xs font-normal text-ink/50">{share(c.total)}%</span>
                        </a>
                        <div className="mt-1.5 h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-sand" aria-label={`${pct}% pagado`}>
                          <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="hidden px-3 py-2.5 text-right whitespace-nowrap sm:table-cell">{money(c.total, currency)}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap text-teal">{money(c.paid, currency)}</td>
                      <td className="py-2.5 pl-3 text-right whitespace-nowrap text-rust">{money(c.pending, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function BudgetItemCard({
  item,
  ipc,
  anchor,
  paymentAction,
  children,
}: {
  item: BudgetItem;
  ipc: IpcSeries | null;
  /** Element id the overview links to (the first card of each category). */
  anchor?: string;
  /** Optional control rendered next to each payment (admin delete button). */
  paymentAction?: (payment: Payment) => React.ReactNode;
  children?: React.ReactNode;
}) {
  const s = summarizeItem(item, ipc);
  const adjusted = item.currency === "ARS" && item.adjustment === "ipc";

  return (
    <article id={anchor} className="card scroll-mt-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-xs tracking-[0.2em] text-rust uppercase">
            {categoryName(item.category)}
            {s.pending <= 0 && <span className="chip bg-mint/25 py-0.5 tracking-normal text-forest normal-case">Pagado al 100%</span>}
          </p>
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

      {item.dueDate && s.pending > 0 && (
        <p className="flex items-center gap-2 text-sm font-medium text-rust">
          <Icon name="calendar" className="h-4 w-4" />
          Próximo vencimiento: {formatDay(item.dueDate)}
        </p>
      )}
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
