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
