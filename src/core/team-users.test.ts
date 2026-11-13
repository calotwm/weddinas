import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "./session";
import { authenticateTeamUser, effectiveTeamUsers, hashTeamPassword, newPasswordProblem, parseTeamUsers, passwordOverride, TeamUsersError, verifyTeamPassword } from "./team-users";

describe("team passwords", () => {
  it("hashes with a random salt and verifies only the same password", () => {
    const a = hashTeamPassword("clave-de-canela");
    const b = hashTeamPassword("clave-de-canela");
    expect(a).toMatch(/^scrypt\$[\w-]+\$[\w-]+$/);
    expect(a).not.toBe(b);
    expect(verifyTeamPassword("clave-de-canela", a)).toBe(true);
    expect(verifyTeamPassword("clave-de-canelA", a)).toBe(false);
    expect(verifyTeamPassword("clave-de-canela", "scrypt$broken")).toBe(false);
    expect(verifyTeamPassword("clave-de-canela", "plain-text")).toBe(false);
  });

  it("the hashing script writes a line ADMIN_USERS accepts", () => {
    const line = execFileSync(process.execPath, ["scripts/hash-team-password.mjs", "Canela@Weddinas.com", "clave-de-canela"], { encoding: "utf8" }).trim();
    const users = parseTeamUsers(line);
    expect([...users.keys()]).toEqual(["canela@weddinas.com"]);
    expect(authenticateTeamUser(users, "canela@weddinas.com", "clave-de-canela")).toBe("canela@weddinas.com");
  });
});

describe("parseTeamUsers", () => {
  const canela = hashTeamPassword("clave-de-canela");
  const paula = hashTeamPassword("clave-de-paula");

  it("reads email=hash entries separated by commas, semicolons or new lines, lowercasing emails", () => {
    const users = parseTeamUsers(` Canela@weddinas.com=${canela} ;\npaula@weddinas.com=${paula},`);
    expect([...users]).toEqual([
      ["canela@weddinas.com", canela],
      ["paula@weddinas.com", paula],
    ]);
  });

  it("is empty when unset or blank (the shared code stays in use)", () => {
    expect(parseTeamUsers(undefined).size).toBe(0);
    expect(parseTeamUsers("  \n ").size).toBe(0);
  });

  it("fails closed on malformed entries, plain-text passwords and duplicates", () => {
    expect(() => parseTeamUsers("canela@weddinas.com")).toThrow(TeamUsersError);
    expect(() => parseTeamUsers("no-es-mail=" + canela)).toThrow(TeamUsersError);
    expect(() => parseTeamUsers("canela@weddinas.com=mi-clave")).toThrow(TeamUsersError);
    expect(() => parseTeamUsers(`canela@weddinas.com=${canela},CANELA@weddinas.com=${paula}`)).toThrow(TeamUsersError);
  });
});

describe("authenticateTeamUser", () => {
  const users = parseTeamUsers(`canela@weddinas.com=${hashTeamPassword("clave-de-canela")}`);

  it("returns the normalized email for the right password, ignoring email case and spaces", () => {
    expect(authenticateTeamUser(users, "  CANELA@weddinas.com ", "clave-de-canela")).toBe("canela@weddinas.com");
  });

  it("rejects a wrong password, an unknown email and empty input", () => {
    expect(authenticateTeamUser(users, "canela@weddinas.com", "otra")).toBeNull();
    expect(authenticateTeamUser(users, "natasha@weddinas.com", "clave-de-canela")).toBeNull();
    expect(authenticateTeamUser(users, "", "")).toBeNull();
  });
});

describe("admin sessions", () => {
  it("carry the team member's email, and sessions without one still verify", () => {
    const withUser = verifySession(signSession({ role: "admin", key: "k", user: "canela@weddinas.com" }, "s", 60), "s");
    expect(withUser).toEqual({ role: "admin", key: "k", user: "canela@weddinas.com" });
    expect(verifySession(signSession({ role: "admin", key: "k" }, "s", 60), "s")).toEqual({ role: "admin", key: "k" });
  });
});

describe("passwords changed from the app", () => {
  const envHash = hashTeamPassword("clave-inicial-canela");
  const env = parseTeamUsers(`canela@weddinas.com=${envHash}`);
  const changed = hashTeamPassword("clave-nueva-canela");

  it("a changed password replaces the ADMIN_USERS one for that member only", () => {
    const users = effectiveTeamUsers(env, { "canela@weddinas.com": passwordOverride(changed, envHash) });
    expect(authenticateTeamUser(users, "canela@weddinas.com", "clave-nueva-canela")).toBe("canela@weddinas.com");
    expect(authenticateTeamUser(users, "canela@weddinas.com", "clave-inicial-canela")).toBeNull();
  });

  it("a member removed from ADMIN_USERS stays out even with a changed password", () => {
    const users = effectiveTeamUsers(new Map(), { "canela@weddinas.com": passwordOverride(changed, envHash) });
    expect(users.size).toBe(0);
  });

  it("a new password set in ADMIN_USERS (reset) wins over the one changed in the app", () => {
    const resetHash = hashTeamPassword("clave-reseteada-canela");
    const users = effectiveTeamUsers(parseTeamUsers(`canela@weddinas.com=${resetHash}`), { "canela@weddinas.com": passwordOverride(changed, envHash) });
    expect(authenticateTeamUser(users, "canela@weddinas.com", "clave-reseteada-canela")).toBe("canela@weddinas.com");
    expect(authenticateTeamUser(users, "canela@weddinas.com", "clave-nueva-canela")).toBeNull();
  });

  it("ignores malformed stored overrides instead of locking the member out", () => {
    const users = effectiveTeamUsers(env, { "canela@weddinas.com": { hash: "plain", base: "x" } as never, otro: null as never });
    expect(authenticateTeamUser(users, "canela@weddinas.com", "clave-inicial-canela")).toBe("canela@weddinas.com");
  });

  it("checks the new password: length, different from the current one, and repeated the same", () => {
    expect(newPasswordProblem("actual-123456", "corta", "corta")).toBe("La clave nueva tiene que tener al menos 10 caracteres.");
    expect(newPasswordProblem("actual-123456", "x".repeat(201), "x".repeat(201))).toBe("La clave nueva puede tener hasta 200 caracteres.");
    expect(newPasswordProblem("actual-123456", "actual-123456", "actual-123456")).toBe("La clave nueva tiene que ser distinta de la actual.");
    expect(newPasswordProblem("actual-123456", "nueva-1234567", "nueva-1234568")).toBe("Las claves nuevas no coinciden.");
    expect(newPasswordProblem("actual-123456", "nueva-1234567", "nueva-1234567")).toBeNull();
  });
});
