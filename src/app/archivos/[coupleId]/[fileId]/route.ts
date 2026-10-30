import { canAccessCouple } from "@/server/auth";
import { files } from "@/server/container";

/** Serves a couple's uploaded image only to that couple or the team; anyone else gets a 404. */
export async function GET(_req: Request, { params }: { params: Promise<{ coupleId: string; fileId: string }> }) {
  const { coupleId, fileId } = await params;
  const file = (await canAccessCouple(coupleId)) ? await files.read(coupleId, fileId) : null;
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
