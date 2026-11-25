import { describe, expect, it } from "vitest";
import { KEEPALIVE_EVERY_MS, keepAliveDue } from "./session-keepalive";
import { signSession, verifySession } from "./session";

describe("admin session keep-alive", () => {
  it("renews once the last renewal is older than the interval, and not before", () => {
    const start = 1_000_000;
    expect(keepAliveDue(start, start + KEEPALIVE_EVERY_MS - 1)).toBe(false);
    expect(keepAliveDue(start, start + KEEPALIVE_EVERY_MS)).toBe(true);
  });

  it("a renewed cookie outlives the original expiry", () => {
    const ttl = 60;
    const session = { role: "admin" as const, key: "k" };
    const first = signSession(session, "s", ttl, 0);
    const renewed = signSession(session, "s", ttl, 50_000);
    expect(verifySession(first, "s", 70_000)).toBeNull();
    expect(verifySession(renewed, "s", 70_000)).toEqual(session);
  });
});
