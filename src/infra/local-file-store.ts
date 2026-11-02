import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { detectDocument, detectImage, isFileId, MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES, mimeForFileId, type FileType } from "@/core/uploads";

const COUPLE_ID = /^[A-Za-z0-9-]{1,64}$/;

/** Stores uploaded images on disk, one folder per couple (on Railway: the same volume as the JSON database). */
export class LocalFileStore {
  constructor(private readonly root: string) {}

  saveImage(coupleId: string, bytes: Uint8Array): Promise<string> {
    return this.save(coupleId, bytes, MAX_IMAGE_BYTES, detectImage, "Not a supported image");
  }

  /** PDF or image, for attachments. */
  saveDocument(coupleId: string, bytes: Uint8Array): Promise<string> {
    return this.save(coupleId, bytes, MAX_DOCUMENT_BYTES, detectDocument, "Not a supported file");
  }

  private async save(
    coupleId: string,
    bytes: Uint8Array,
    maxBytes: number,
    detect: (bytes: Uint8Array) => FileType | null,
    unsupported: string,
  ): Promise<string> {
    const dir = this.coupleDir(coupleId);
    if (!dir) throw new Error("Invalid couple id");
    if (bytes.byteLength > maxBytes) throw new Error("File too large");
    const type = detect(bytes);
    if (!type) throw new Error(unsupported);
    // Only PDFs get the larger document limit; images keep theirs wherever they are uploaded.
    if (type.ext !== "pdf" && bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("File too large");
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
