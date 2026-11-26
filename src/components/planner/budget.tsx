import { categoryName } from "@/core/brief-catalog";
import type { BriefBlock } from "@/core/couple";

/** The couple's brief, so custom rubros show the name the team gave them. */
type RubroNames = ReadonlyArray<Pick<BriefBlock, "key" | "name">>;
import { budgetStage, dueItems, itemCategories, itemCategoryName, orderByStage, paidVsPending, paymentFiles, summarizeBudget, summarizeItem, type BudgetStage, type RubroReceipt } from "@/core/budget";
import type { Budget, BudgetCharge, BudgetItem, FreightIncluded, Payment, PaymentKind } from "@/core/couple";
import type { IpcSeries, UsdQuote } from "@/core/money";
import { addDays, formatDay, formatMoney, formatMonth } from "@/lib/format";
import { Icon } from "../icons";

export const PAYMENT_KIND: Record<PaymentKind, string> = {
  sena: "Seña",
  intermedio: "Intermedio",
  saldo: "Saldo",
  adicional: "Adicional",
  iva: "IVA",
};

/** Flete/Viáticos: whether the vendor's price includes them; a missing value means nobody recorded it. */
export const FREIGHT_LABEL: Record<FreightIncluded | "unknown", string> = {
  yes: "Incluido",
  no: "No incluido",
  unknown: "Sin dato",
};

const money = (value: number | null, currency: "ARS" | "USD") => (value === null ? "—" : formatMoney(value, currency));

export const receiptUrl = (coupleId: string, receiptId: string) => `/archivos/${coupleId}/${receiptId}`;

export function RatesNote({ ipc, quote }: { ipc: IpcSeries | null; quote: UsdQuote | null }) {
  const lastIpc = ipc?.points.at(-1)?.month;
  return (
    <p className="hint flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="inline-flex items-center gap-1.5">
        <Icon name="sparkle" className="h-3.5 w-3.5" />
        {quote
          ? `Dólar ${quote.label.toLowerCase()}: ${formatMoney(quote.rate, "ARS")} (promedio entre compra y venta, según ${quote.kind === "blue" ? "DolarHoy" : "dolarapi.com"})`
          : "Cotización del dólar no disponible"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Icon name="calendar" className="h-3.5 w-3.5" />
        {lastIpc ? `Último IPC publicado (INDEC): ${formatMonth(lastIpc)}` : "IPC no disponible: saldos sin ajustar"}
      </span>
    </p>
  );
}

/** Pie colors: paid (teal) and what is left (rust), matching the stat cards. */
const PAID_COLOR = "#0a8983";
const PENDING_COLOR = "#c6541a";

export const categoryAnchor = (category: string) => `rubro-${category}`;

/**
 * Estimates (no vendor yet) first, then items with a balance, fully paid ones last; the first card of each category
 * gets the anchor the overview links to, and the first fully paid card is flagged so the page can draw the
 * "Pago al 100%" divider before it.
 */
export function orderedBudgetItems(
  items: BudgetItem[],
  ipc: IpcSeries | null,
): Array<{ item: BudgetItem; anchor?: string; firstPaid?: boolean }> {
  const seen = new Set<string>();
  const ordered = orderByStage(items, ipc);
  const firstPaidAt = ordered.findIndex((item) => budgetStage(item, ipc) === "paid");
  return ordered.map((item, i) => {
    const firstPaid = i === firstPaidAt && i > 0 ? true : undefined;
    const key = itemCategories(item).join("+");
    if (seen.has(key)) return { item, firstPaid };
    seen.add(key);
    return { item, anchor: categoryAnchor(key), firstPaid };
  });
}

/** Separates the items that still have a balance from the ones paid in full: a filled band across the whole grid. */
const STAGE: Record<BudgetStage, { label: string; chip: string; ring: string }> = {
  estimate: { label: "Estimado", chip: "bg-yellow-100 text-yellow-900", ring: "ring-yellow-300" },
  pending: { label: "Pendiente de pago", chip: "bg-red-100 text-red-800", ring: "ring-red-300" },
  paid: { label: "Pago al 100%", chip: "bg-green-100 text-green-800", ring: "ring-green-300" },
};

export function PaidDivider() {
  return (
    <div
      role="separator"
      aria-label="Pago al 100%"
      className="col-span-full mt-2 flex w-full items-center justify-center gap-3 rounded-2xl bg-mint/30 px-6 py-5 text-forest ring-1 ring-mint/60"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest text-cream">
        <Icon name="check" className="h-5 w-5" />
      </span>
      <span className="font-display text-2xl sm:text-3xl">Pago al 100%</span>
    </div>
  );
}

/** A rubro's payment receipts as links ("Archivo de pago 10/06/2026"), for its brief block. */
export function ReceiptLinks({ coupleId, receipts }: { coupleId: string; receipts: RubroReceipt[] }) {
  if (receipts.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {receipts.map((r) => (
        <li key={r.paymentId}>
          <a
            href={receiptUrl(coupleId, r.receiptId)}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-semibold text-teal ring-1 ring-forest/10 underline-offset-4 hover:underline"
          >
            <Icon name="file" className="h-3.5 w-3.5" />
            Archivo de pago {formatDay(r.date)}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Payments due within a week, or already overdue. */
export function DueAlert({ items, ipc, today, brief }: { items: BudgetItem[]; ipc: IpcSeries | null; today: string; brief?: RubroNames }) {
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
              <a href={`#${categoryAnchor(itemCategories(item).join("+"))}`} className="font-semibold text-forest underline-offset-4 hover:underline">
                {item.vendor || itemCategoryName(item, brief)}
              </a>
              : {formatMoney(pending, item.currency)} · {overdue ? "venció el" : "vence el"} {formatDay(item.dueDate!)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function BudgetOverview({ budget, ipc, quote, brief }: { budget: Budget; ipc: IpcSeries | null; quote: UsdQuote | null; brief?: RubroNames }) {
  const s = summarizeBudget(budget.items, ipc, quote?.rate ?? null);
  const perGuest = budget.guests && s.totalUsd !== null ? s.totalUsd / budget.guests : null;
  const stats = [
    { label: "Total estimado", usd: s.totalUsd, tone: "text-forest" },
    { label: "Pago", usd: s.paidUsd, tone: "text-teal" },
    { label: "Falta pagar", usd: s.pendingUsd, tone: "text-rust" },
  ];
  const split = paidVsPending(s);
  const paidDeg = split ? (split.paidPercent / 100) * 360 : 0;

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink/70">
        Montos en <strong className="text-forest">USD dólares</strong>
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="card !p-5">
            <p className="label">{stat.label}</p>
            <p className={`font-display text-3xl ${stat.tone}`}>{money(stat.usd, "USD")}</p>
          </div>
        ))}
      </div>
      {perGuest !== null && (
        <p className="text-sm text-ink/70">
          {budget.guests} invitados · costo por invitado aprox. <strong className="text-forest">{formatMoney(perGuest, "USD")}</strong>
        </p>
      )}

      {s.categories.length > 0 && (
        <div className="card grid items-center gap-6 md:grid-cols-[13rem_1fr]">
          <div className="space-y-3">
            <div
              role="img"
              aria-label={split ? `Pagaron el ${split.paidPercent}% y falta el ${100 - split.paidPercent}%` : "Sin total en dólares para graficar"}
              className="mx-auto aspect-square w-44 rounded-full ring-1 ring-forest/10 md:w-full"
              style={{
                background: split ? `conic-gradient(${PAID_COLOR} 0deg ${paidDeg}deg, ${PENDING_COLOR} ${paidDeg}deg 360deg)` : "var(--color-sand)",
              }}
            />
            {split && (
              <ul className="flex justify-center gap-4 text-sm">
                <li className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: PAID_COLOR }} />
                  Pagado {split.paidPercent}%
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: PENDING_COLOR }} />
                  Falta {100 - split.paidPercent}%
                </li>
              </ul>
            )}
          </div>
          <div className="overflow-x-auto">
            <p className="mb-2 text-xs text-ink/55">Tocá un rubro para ver su desglose.</p>
            <table className="w-full text-sm">
              <thead className="text-left text-xs tracking-wider text-ink/60 uppercase">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Rubro</th>
                  <th className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Total</th>
                  <th className="px-3 py-2 text-right font-semibold">Pago</th>
                  <th className="py-2 pl-3 text-right font-semibold">Falta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest/5">
                {s.categories.map((c) => {
                  const pct = c.totalUsd && c.paidUsd !== null ? Math.min(100, Math.round((c.paidUsd / c.totalUsd) * 100)) : 0;
                  return (
                    <tr key={c.category}>
                      <td className="py-2.5 pr-3">
                        <a href={`#${categoryAnchor(c.category)}`} className="font-semibold text-forest underline-offset-4 hover:underline">
                          {c.categories.map((k) => categoryName(k, brief)).join(" + ")}
                        </a>
                        <div className="mt-1.5 h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-sand" aria-label={`${pct}% pago`}>
                          <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="hidden px-3 py-2.5 text-right whitespace-nowrap sm:table-cell">{money(c.totalUsd, "USD")}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap text-teal">{money(c.paidUsd, "USD")}</td>
                      <td className="py-2.5 pl-3 text-right whitespace-nowrap text-rust">{money(c.pendingUsd, "USD")}</td>
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
  coupleId,
  item,
  ipc,
  anchor,
  paymentAction,
  receiptAction,
  fileAction,
  chargeAction,
  brief,
  children,
}: {
  coupleId: string;
  item: BudgetItem;
  ipc: IpcSeries | null;
  /** Element id the overview links to (the first card of each category). */
  anchor?: string;
  /** Optional control rendered next to each payment (admin delete button). */
  paymentAction?: (payment: Payment) => React.ReactNode;
  /** Optional control to add payment files ("archivos de pago"). */
  receiptAction?: (payment: Payment) => React.ReactNode;
  /** Optional control next to each payment file (team delete button). */
  fileAction?: (payment: Payment, fileId: string) => React.ReactNode;
  /** Optional control next to each additional charge still to pay (team delete button). */
  chargeAction?: (charge: BudgetCharge) => React.ReactNode;
  brief?: RubroNames;
  children?: React.ReactNode;
}) {
  const s = summarizeItem(item, ipc);
  const adjusted = item.currency === "ARS" && item.adjustment === "ipc";
  const stage = STAGE[budgetStage(item, ipc)];

  return (
    <article id={anchor} className={`card scroll-mt-6 space-y-4 ring-2 ${stage.ring}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-xs tracking-[0.2em] text-rust uppercase">
            {itemCategoryName(item, brief)}
            <span className={`chip py-0.5 tracking-normal normal-case ${stage.chip}`}>{stage.label}</span>
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
          <p className="label !mb-0.5">Pago</p>
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
      <p className="text-sm text-ink/70">
        <span className="font-semibold text-forest">Flete/Viáticos:</span> {FREIGHT_LABEL[item.freight ?? "unknown"]}
        {item.freight === "no" && (item.freightPaid ? " · pagos" : <span className="font-medium text-rust"> · faltan pagar</span>)}
      </p>
      {item.confirmedGuests !== undefined && (
        <p className="flex items-center gap-2 text-sm text-ink/70">
          <Icon name="users" className="h-4 w-4 text-teal" />
          <span className="font-semibold text-forest">Invitados confirmados:</span> {item.confirmedGuests}
        </p>
      )}
      {item.note && <p className="text-sm text-ink/70">{item.note}</p>}

      {(item.charges ?? []).length > 0 && (
        <ul className="space-y-1 rounded-2xl bg-red-50 px-4 py-2.5 text-sm ring-1 ring-red-200">
          {item.charges!.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              <span className="chip bg-red-100 text-red-800">Adicional por pagar</span>
              <span className="text-ink/70">{c.concept}</span>
              <span className="ml-auto font-semibold text-red-800">{formatMoney(c.amount, item.currency)}</span>
              {chargeAction?.(c)}
            </li>
          ))}
        </ul>
      )}

      {item.payments.length > 0 && (
        <ul className="divide-y divide-forest/5 rounded-2xl ring-1 ring-forest/10">
          {item.payments.map((p) => (
            <li key={p.id} className="space-y-2 px-4 py-2.5 text-sm">
              <div className="flex items-center gap-3">
                <span className="chip bg-sand text-ink/70">{PAYMENT_KIND[p.kind]}</span>
                <span className="text-ink/60">{formatDay(p.date)}</span>
                <span className="ml-auto text-right">
                  <span className="font-semibold text-forest">{formatMoney(p.amount, p.currency)}</span>
                  {p.arsPerUsd && <span className="block text-xs text-ink/50">a {formatMoney(p.arsPerUsd, "ARS")} por dólar</span>}
                  {p.note && <span className="block text-xs text-ink/50">{p.note}</span>}
                  {paymentFiles(p).map((fileId, n, all) => (
                    <span key={fileId} className="flex items-center justify-end gap-1">
                      <a
                        href={receiptUrl(coupleId, fileId)}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal underline-offset-4 hover:underline"
                      >
                        <Icon name="file" className="h-3 w-3" />
                        {all.length === 1 ? "Ver archivo de pago" : `Archivo de pago ${n + 1}`}
                      </a>
                      {fileAction?.(p, fileId)}
                    </span>
                  ))}
                </span>
                {paymentAction?.(p)}
              </div>
              {receiptAction?.(p)}
            </li>
          ))}
        </ul>
      )}

      {children}
    </article>
  );
}
