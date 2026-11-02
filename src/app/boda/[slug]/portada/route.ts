import { files, portal } from "@/server/container";

/** The couple's current cover photo is public, like the page that shows it; any other file stays private. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const cover = await portal.coverPhoto((await params).slug);
  const file = cover ? await files.read(cover.coupleId, cover.photoId) : null;
  if (!file || !file.mime.startsWith("image/")) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
