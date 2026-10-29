import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PortalService } from "./portal-service";
import { RateLimiter } from "./rate-limit";
import { signSession, verifySession } from "./session";
import { cssUrl, safeHttpUrl } from "./url";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

describe("session expiry", () => {
  const secret = "test-secret";
  const now = Date.parse("2026-01-01T00:00:00Z");

  it("accepts a token before it expires and rejects it afterwards", () => {
    const token = signSession({ role: "admin", key: "k1" }, secret, 60, now);
    expect(verifySession(token, secret, now + 59_000)).toEqual({ role: "admin", key: "k1" });
    expect(verifySession(token, secret, now + 61_000)).toBeNull();
  });

  it("rejects tokens without an expiry", () => {
    const body = Buffer.from(JSON.stringify({ role: "admin", key: "k1" })).toString("base64url");
    const legacy = signSession({ role: "admin", key: "k1" }, secret, 60, now).split(".")[1];
    expect(verifySession(`${body}.${legacy}`, secret, now)).toBeNull();
  });
});

describe("RateLimiter", () => {
  it("blocks a key after the limit and frees it when the window passes", () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.hit("ip", 0)).toBe(true);
    expect(limiter.hit("ip", 10)).toBe(true);
    expect(limiter.hit("ip", 20)).toBe(false);
    expect(limiter.hit("other", 20)).toBe(true);
    expect(limiter.hit("ip", 1001)).toBe(true);
  });
});

describe("URL safety", () => {
  it("keeps only http(s) URLs", () => {
    expect(safeHttpUrl("https://weddinas.com/a.jpg")).toBe("https://weddinas.com/a.jpg");
    expect(safeHttpUrl("javascript:alert(1)")).toBe("");
    expect(safeHttpUrl("not a url")).toBe("");
  });

  it("builds CSS url() values that cannot break out of the declaration", () => {
    const value = cssUrl('https://x.com/a.jpg");background:red;(');
    expect(value.startsWith('url("https://x.com/')).toBe(true);
    expect(value.slice(5, -2)).not.toContain('"');
    expect(cssUrl("javascript:alert(1)")).toBe("none");
  });
});

describe("PortalService concurrency and credentials", () => {
  let dir: string;
  let service: PortalService;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-sec-"));
    service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("does not lose concurrent updates to the same couple", async () => {
    const { couple } = await service.createCouple({ partnerA: "Ana", partnerB: "Juan", weddingDate: "2027-03-20T19:00" });
    await Promise.all([service.addTask(couple.id, "Flores"), service.addTask(couple.id, "Música")]);
    const saved = await service.getCouple(couple.id);
    expect(saved?.tasks.map((t) => t.title).sort()).toEqual(["Flores", "Música"]);
  });

  it("changes the credential fingerprint when the access code is regenerated", async () => {
    const { couple } = await service.createCouple({ partnerA: "Ana", partnerB: "Juan", weddingDate: "2027-03-20T19:00" });
    const before = await service.credentialFingerprint(couple.id);
    await service.regenerateCode(couple.id);
    expect(before).toBeTruthy();
    expect(await service.credentialFingerprint(couple.id)).not.toBe(before);
    expect(await service.credentialFingerprint("missing")).toBeNull();
  });
});
