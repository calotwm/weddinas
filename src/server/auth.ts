import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signSession, verifySession, type Session } from "@/core/session";

const COOKIE = "weddinas_session";

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is required in production");
  return "dev-only-session-secret";
}

export function adminCode(): string {
  const value = process.env.ADMIN_CODE;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("ADMIN_CODE is required in production");
  return "weddinas-admin";
}

export async function startSession(session: Session): Promise<void> {
  (await cookies()).set(COOKIE, signSession(session, secret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
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
  return session.coupleId;
}

export async function requireAdmin(): Promise<void> {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/admin/login");
}
