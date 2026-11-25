const GOOGLE_SHEET = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/;

/** Where the "Descargar timing" button points: a Google Sheets link downloads as .xlsx; other links open as they are. */
export function timingDownloadUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const sheet = GOOGLE_SHEET.exec(trimmed);
  return sheet ? `https://docs.google.com/spreadsheets/d/${sheet[1]}/export?format=xlsx` : trimmed;
}
