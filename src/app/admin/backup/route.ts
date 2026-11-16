import { isAdmin } from "@/server/auth";
import { databaseSnapshot } from "@/server/container";

export const dynamic = "force-dynamic";

/** Downloads the couples database for the team; anyone else gets a 404. Uploaded photos are not included. */
export async function GET() {
  if (!(await isAdmin())) return new Response("Not found", { status: 404 });

  const stamp = new Date().toISOString().slice(0, 16).replace(":", "-");
  return new Response(databaseSnapshot(), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="weddinas-backup-${stamp}.json"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
