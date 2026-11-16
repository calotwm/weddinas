import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalFileStore } from "./local-file-store";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "weddinas-files-"));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("LocalFileStore.deleteCouple", () => {
  it("removes every file of that couple and keeps the other couples' files", async () => {
    const store = new LocalFileStore(root);
    const a = await store.saveImage("couple-a", PNG);
    const b = await store.saveImage("couple-b", PNG);

    await store.deleteCouple("couple-a");

    expect(await store.read("couple-a", a)).toBeNull();
    expect(existsSync(path.join(root, "couple-a"))).toBe(false);
    expect(await store.read("couple-b", b)).not.toBeNull();
  });

  it("ignores an invalid couple id instead of touching other paths", async () => {
    const store = new LocalFileStore(path.join(root, "uploads"));
    const kept = await store.saveImage("couple-b", PNG);
    await store.deleteCouple("..");
    await store.deleteCouple("");
    expect(await store.read("couple-b", kept)).not.toBeNull();
  });

  it("does nothing for a couple without files", async () => {
    await expect(new LocalFileStore(root).deleteCouple("couple-z")).resolves.toBeUndefined();
  });
});
