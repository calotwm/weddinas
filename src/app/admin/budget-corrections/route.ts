import { BudgetCorrectionError, parseBudgetCorrections } from "@/core/budget-corrections";
import { isAdmin } from "@/server/auth";
import { portal } from "@/server/container";

export const dynamic = "force-dynamic";

const MAX_BYTES = 2_000_000;

/**
 * Applies a one-off corrections file to imported budget items (see core/budget-corrections); team only, anyone else
 * gets a 404. JSON only: a cross-site form cannot send it, and the session cookie is SameSite=Lax.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return new Response("Not found", { status: 404 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "Send the corrections as JSON." }, { status: 415 });
  const body = await request.text();
  if (body.length > MAX_BYTES) return Response.json({ error: "The corrections file is too large." }, { status: 413 });
  try {
    return Response.json(await portal.applyBudgetCorrections(parseBudgetCorrections(body)));
  } catch (e) {
    if (e instanceof BudgetCorrectionError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
