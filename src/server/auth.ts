import "server-only";
import { createHmac } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { RateLimiter } from "@/core/rate-limit";
import { signSession, verifySession, type Session } from "@/core/session";
import { authenticateTeamUser, parseTeamUsers } from "@/core/team-users";
import { portal } from "./container";

const COOKIE = "weddinas_session";
const COUPLE_TTL = 60 * 60 * 24 * 30;
const ADMIN_TTL = 60 * 60 * 12;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is required in production");
  return "dev-only-session-secret";
}

/** Team members with their own login (ADMIN_USERS); empty means the shared ADMIN_CODE is still in use. */
export function teamUsers(): Map<string, string> {
  return parseTeamUsers(process.env.ADMIN_USERS);
}

export const teamLoginUsesEmail = () => teamUsers().size > 0;

/** The member's email for valid credentials, or null; only meaningful when teamLoginUsesEmail(). */
export const checkTeamUser = (email: string, password: string) => authenticateTeamUser(teamUsers(), email, password);

export function adminCode(): string {
  const value = process.env.ADMIN_CODE;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("ADMIN_CODE is required in production");
  return "weddinas-admin";
}

/** Derives a session key from a credential without exposing the credential (or its hash) in the cookie. */
const credentialKey = (scope: string, credential: string) =>
  createHmac("sha256", secret()).update(`${scope}:${credential}`).digest("base64url").slice(0, 22);

async function setSessionCookie(session: Session, ttl: number): Promise<void> {
  (await cookies()).set(COOKIE, signSession(session, secret(), ttl), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ttl,
  });
}

/**
 * With ADMIN_USERS, a session is bound to its member's email and password hash: removing the member or changing
 * the password revokes it. Without it, sessions are bound to the shared ADMIN_CODE as before.
 */
function adminKey(user: string | undefined): string | null {
  const users = teamUsers();
  if (users.size === 0) return user ? null : credentialKey("admin", adminCode());
  const hash = user ? users.get(user) : undefined;
  return hash ? credentialKey("admin", `user:${user}:${hash}`) : null;
}

function isAdminSession(session: Session | null): boolean {
  if (session?.role !== "admin") return false;
  const key = adminKey(session.user);
  return key !== null && key === session.key;
}

export async function startAdminSession(user?: string): Promise<void> {
  const key = adminKey(user);
  if (!key) throw new Error("Unknown team member");
  await setSessionCookie(user ? { role: "admin", key, user } : { role: "admin", key }, ADMIN_TTL);
}

export async function startCoupleSession(coupleId: string): Promise<void> {
  const fingerprint = await portal.credentialFingerprint(coupleId);
  if (!fingerprint) return;
  await setSessionCookie({ role: "couple", coupleId, key: credentialKey("couple", fingerprint) }, COUPLE_TTL);
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? verifySession(token, secret()) : null;
}

export async function requireCoupleId(): Promise<string> {
  const session = await getSession();
  if (session?.role !== "couple") redirect("/");
  const fingerprint = await portal.credentialFingerprint(session.coupleId);
  if (!fingerprint || credentialKey("couple", fingerprint) !== session.key) redirect("/");
  return session.coupleId;
}

/** True for a valid admin session or the couple's own valid session; never redirects. */
export async function canAccessCouple(coupleId: string): Promise<boolean> {
  const session = await getSession();
  if (session?.role === "admin") return isAdminSession(session);
  if (session?.role !== "couple" || session.coupleId !== coupleId) return false;
  const fingerprint = await portal.credentialFingerprint(coupleId);
  return !!fingerprint && credentialKey("couple", fingerprint) === session.key;
}

/** Call from every admin page and action: layouts are not re-run on client navigation. */
export async function requireAdmin(): Promise<void> {
  if (!isAdminSession(await getSession())) redirect("/admin/login");
}

// Per-IP limits stop guessing from one client; the global admin cap also covers spoofed or rotating IPs.
const WINDOW = 15 * 60 * 1000;
const coupleLogins = new RateLimiter(10, WINDOW);
const adminLogins = new RateLimiter(5, WINDOW);
const adminLoginsGlobal = new RateLimiter(30, WINDOW);

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "unknown";
}

export async function allowLoginAttempt(kind: "couple" | "admin"): Promise<boolean> {
  const ip = await clientIp();
  if (kind === "couple") return coupleLogins.hit(ip);
  return adminLoginsGlobal.hit("all") && adminLogins.hit(ip);
}
