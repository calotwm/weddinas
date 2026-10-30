import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { detectImage, isFileId, MAX_IMAGE_BYTES, mimeForFileId } from "@/core/uploads";

const COUPLE_ID = /^[A-Za-z0-9-]{1,64}$/;

/** Stores uploaded images on disk, one folder per couple (on Railway: the same volume as the JSON database). */
export class LocalFileStore {
  constructor(private readonly root: string) {}

  async saveImage(coupleId: string, bytes: Uint8Array): Promise<string> {
    const dir = this.coupleDir(coupleId);
    if (!dir) throw new Error("Invalid couple id");
    if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("File too large");
    const type = detectImage(bytes);
    if (!type) throw new Error("Not a supported image");
    const id = `${randomUUID()}.${type.ext}`;
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, id), bytes);
    return id;
  }

  async read(coupleId: string, fileId: string): Promise<{ bytes: Buffer; mime: string } | null> {
    const dir = this.coupleDir(coupleId);
    if (!dir || !isFileId(fileId)) return null;
    try {
      return { bytes: await readFile(path.join(dir, fileId)), mime: mimeForFileId(fileId) };
    } catch {
      return null;
    }
  }

  async delete(coupleId: string, fileId: string): Promise<void> {
    const dir = this.coupleDir(coupleId);
    if (dir && isFileId(fileId)) await rm(path.join(dir, fileId), { force: true });
  }

  private coupleDir(coupleId: string): string | null {
    return COUPLE_ID.test(coupleId) ? path.join(this.root, coupleId) : null;
  }
}
