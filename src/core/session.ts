import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * `key` binds the session to the credential used to log in (admin code or couple access code),
 * so rotating that credential revokes every session created with it.
 */
export type Session = { role: "admin"; key: string } | { role: "couple"; coupleId: string; key: string };

const sign = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest("base64url");

export function signSession(session: Session, secret: string, ttlSeconds: number, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ ...session, exp: now + ttlSeconds * 1000 })).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function verifySession(token: string, secret: string, now = Date.now()): Session | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof parsed?.exp !== "number" || parsed.exp <= now || typeof parsed.key !== "string") return null;
    if (parsed.role === "admin") return { role: "admin", key: parsed.key };
    if (parsed.role === "couple" && typeof parsed.coupleId === "string") {
      return { role: "couple", coupleId: parsed.coupleId, key: parsed.key };
    }
    return null;
  } catch {
    return null;
  }
}
