/**
 * The team session slides: while someone uses the panel, the browser asks the server to re-sign the cookie at most
 * this often, so it only ends after ADMIN_TTL without activity.
 */
export const KEEPALIVE_EVERY_MS = 15 * 60 * 1000;

export const keepAliveDue = (lastRenewedAt: number, now: number) => now - lastRenewedAt >= KEEPALIVE_EVERY_MS;
