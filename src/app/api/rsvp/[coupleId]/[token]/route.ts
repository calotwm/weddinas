import { parseRsvp, rsvpBodyEntries } from "@/core/rsvp";
import { RateLimiter } from "@/core/rate-limit";
import { portal } from "@/server/container";

// Webhook for the agency's Elementor invitation forms ("Form invitación asistencia" → Acciones después del envío → Webhook).
// The URL carries the couple id and its secret; answers that name exactly one guest update that guest, the rest wait
// in the couple's list for the team to assign. A wrong secret looks like a missing page.

const MAX_BYTES = 32 * 1024;
const perCouple = new RateLimiter(120, 60 * 60 * 1000);

const notFound = () => new Response("Not found", { status: 404 });

export async function POST(req: Request, { params }: { params: Promise<{ coupleId: string; token: string }> }) {
  const { coupleId, token } = await params;
  if (coupleId.length > 100 || token.length > 100) return notFound();
  if (!(await portal.isRsvpToken(coupleId, token))) return notFound();
  if (!perCouple.hit(coupleId)) return new Response("Too many requests", { status: 429 });

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) return new Response("Payload too large", { status: 413 });
  const body = await req.text();
  if (body.length > MAX_BYTES) return new Response("Payload too large", { status: 413 });

  const answer = parseRsvp(rsvpBodyEntries(body, req.headers.get("content-type") ?? ""));
  // Elementor shows an error to the guest on any non-2xx, so an answer without a name is acknowledged and ignored.
  if (!answer) return Response.json({ ok: true, stored: false });
  try {
    const result = await portal.receiveRsvp(coupleId, token, answer);
    return Response.json({ ok: true, stored: true, matched: result === "matched" });
  } catch {
    return notFound();
  }
}
