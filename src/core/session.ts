import { createHmac, timingSafeEqual } from "node:crypto";

export type Session = { role: "admin" } | { role: "couple"; coupleId: string };

const sign = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest("base64url");

export function signSession(session: Session, secret: string): string {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function verifySession(token: string, secret: string): Session | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString());
    if (parsed?.role === "admin") return { role: "admin" };
    if (parsed?.role === "couple" && typeof parsed.coupleId === "string") {
      return { role: "couple", coupleId: parsed.coupleId };
    }
    return null;
  } catch {
    return null;
  }
}
