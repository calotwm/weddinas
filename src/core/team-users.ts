import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// One login per team member. ADMIN_USERS holds "email=scrypt$<salt>$<hash>" entries (commas, semicolons or
// new lines between them); only password hashes live there, built with scripts/hash-team-password.mjs.
// Keep the scrypt parameters in sync with that script.

const KEY_LENGTH = 32;
const SCRYPT = { N: 16384, r: 8, p: 1 } as const;
const HASH = /^scrypt\$([\w-]{16,})\$([\w-]{40,})$/;
const EMAIL = /^[^\s@=,;]+@[^\s@=,;]+\.[^\s@=,;]+$/;

export class TeamUsersError extends Error {}

export function hashTeamPassword(password: string, salt: Buffer = randomBytes(16)): string {
  const hash = scryptSync(password, salt, KEY_LENGTH, SCRYPT);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyTeamPassword(password: string, stored: string): boolean {
  const match = HASH.exec(stored);
  if (!match) return false;
  const expected = Buffer.from(match[2], "base64url");
  const actual = scryptSync(password, Buffer.from(match[1], "base64url"), expected.length, SCRYPT);
  return timingSafeEqual(expected, actual);
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Email → password hash. Empty when unset; throws on anything malformed so a typo never opens the panel. */
export function parseTeamUsers(raw: string | undefined): Map<string, string> {
  const users = new Map<string, string>();
  for (const entry of (raw ?? "").split(/[,;\n]/)) {
    if (!entry.trim()) continue;
    const at = entry.indexOf("=");
    const email = normalizeEmail(at < 0 ? entry : entry.slice(0, at));
    const hash = at < 0 ? "" : entry.slice(at + 1).trim();
    if (!EMAIL.test(email)) throw new TeamUsersError("ADMIN_USERS has an entry without a valid email");
    if (!HASH.test(hash)) throw new TeamUsersError(`ADMIN_USERS entry for ${email} is not a password hash`);
    if (users.has(email)) throw new TeamUsersError(`ADMIN_USERS lists ${email} twice`);
    users.set(email, hash);
  }
  return users;
}

// Unknown emails still pay for one scrypt run, so response time does not reveal who has an account.
const DUMMY_HASH = hashTeamPassword("weddinas-dummy-password");

/** The member's normalized email when the password matches; null otherwise. */
export function authenticateTeamUser(users: Map<string, string>, email: string, password: string): string | null {
  const key = normalizeEmail(email);
  const stored = users.get(key);
  const ok = verifyTeamPassword(password, stored ?? DUMMY_HASH);
  return stored && ok ? key : null;
}

// Passwords changed from the app are stored (hashed) in settings, never in ADMIN_USERS. Each one remembers which
// ADMIN_USERS hash it replaced: membership still comes from ADMIN_USERS, and writing a new hash there (a reset for
// a forgotten password) makes the app-changed one stop applying.

export interface PasswordOverride {
  hash: string;
  /** Fingerprint of the ADMIN_USERS hash this password replaced. */
  base: string;
}

export const TEAM_PASSWORD_LIMITS = { min: 10, max: 200 } as const;

const fingerprint = (hash: string) => createHash("sha256").update(hash).digest("base64url").slice(0, 22);

export const passwordOverride = (hash: string, envHash: string): PasswordOverride => ({ hash, base: fingerprint(envHash) });

/** ADMIN_USERS with each member's app-changed password applied while it still replaces their current entry. */
export function effectiveTeamUsers(env: Map<string, string>, overrides: Record<string, PasswordOverride> | undefined): Map<string, string> {
  const users = new Map(env);
  for (const [email, envHash] of env) {
    const override = overrides?.[email];
    if (override && typeof override.hash === "string" && HASH.test(override.hash) && override.base === fingerprint(envHash)) {
      users.set(email, override.hash);
    }
  }
  return users;
}

/** The message to show for an unacceptable new password, or null when it can be saved. */
export function newPasswordProblem(current: string, next: string, repeated: string): string | null {
  if (next.length < TEAM_PASSWORD_LIMITS.min) return `La clave nueva tiene que tener al menos ${TEAM_PASSWORD_LIMITS.min} caracteres.`;
  if (next.length > TEAM_PASSWORD_LIMITS.max) return `La clave nueva puede tener hasta ${TEAM_PASSWORD_LIMITS.max} caracteres.`;
  if (next === current) return "La clave nueva tiene que ser distinta de la actual.";
  if (next !== repeated) return "Las claves nuevas no coinciden.";
  return null;
}
