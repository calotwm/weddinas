export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface ImageType {
  ext: "jpg" | "png" | "webp";
  mime: string;
}

const MIME: Record<ImageType["ext"], string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Identifies an image by its leading bytes, ignoring whatever type the browser claimed (no SVG: it can carry scripts). */
export function detectImage(bytes: Uint8Array): ImageType | null {
  const b = Buffer.from(bytes.subarray(0, 12));
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: MIME.jpg };
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: MIME.png };
  if (b.length >= 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return { ext: "webp", mime: MIME.webp };
  return null;
}

const FILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

/** Generated file ids are a UUID plus an image extension, so they can never point outside a couple's folder. */
export const isFileId = (id: string) => FILE_ID.test(id);

export const mimeForFileId = (id: string) => MIME[id.slice(id.lastIndexOf(".") + 1) as ImageType["ext"]];
