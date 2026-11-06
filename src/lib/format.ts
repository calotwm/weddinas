const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

const shortFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

/** Wedding dates are stored as local Buenos Aires time ("YYYY-MM-DDTHH:mm"). */
export const weddingDateToIso = (local: string) => `${local}:00-03:00`;

export const formatWeddingDate = (local: string) => dateFormatter.format(new Date(weddingDateToIso(local)));

export const formatShortDate = (iso: string) => shortFormatter.format(new Date(iso));

export const formatTime = (local: string) => local.slice(11, 16);

const moneyFormatters = {
  ARS: new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", currencyDisplay: "code", maximumFractionDigits: 0 }),
};

export const formatMoney = (amount: number, currency: "ARS" | "USD") => moneyFormatters[currency].format(amount);

const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-08" -> "agosto de 2026" */
export const formatMonth = (month: string) => monthFormatter.format(new Date(`${month}-01T12:00:00Z`));

/** "2026-10-30" -> "30 oct 2026" */
export const formatDay = (day: string) => shortFormatter.format(new Date(`${day}T12:00:00-03:00`));

/** Current month in Buenos Aires as "YYYY-MM". */
export const currentMonth = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 7);

/** Today in Buenos Aires as "YYYY-MM-DD". */
export const today = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

/** "2026-11-06" plus `n` days, as "YYYY-MM-DD". */
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Last day of the month of `day`, as "YYYY-MM-DD". */
export const monthEnd = (day: string) => {
  const d = new Date(`${day.slice(0, 7)}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
};
