/** A CBU or CVU is exactly 22 digits; spaces and dashes people paste are dropped. Anything else becomes "". */
export function normalizeCbu(value: string): string {
  const digits = value.replace(/[\s-]/g, "");
  return /^\d{22}$/.test(digits) ? digits : "";
}

/** A bank alias is 6 to 20 letters, digits, dots or dashes, case-insensitive. Anything else becomes "". */
export function normalizeAlias(value: string): string {
  const alias = value.trim().toLowerCase();
  return /^[a-z0-9.-]{6,20}$/.test(alias) ? alias : "";
}
