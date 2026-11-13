import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashTeamPassword } from "./team-users";

const state = vi.hoisted(() => ({ jar: new Map<string, string>(), dir: "" }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
  notFound: () => {
    throw new Error("notFound");
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (state.jar.has(name) ? { value: state.jar.get(name) } : undefined),
    set: (name: string, value: string) => void state.jar.set(name, value),
    delete: (name: string) => void state.jar.delete(name),
  }),
  headers: async () => new Headers({ "x-real-ip": `10.0.0.${Math.floor(Math.random() * 250)}` }),
}));
vi.mock("@/server/container", async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const { JsonSettingsRepository } = await import("@/infra/json-settings-repository");
  state.dir = mkdtempSync(path.join(tmpdir(), "weddinas-team-pw-"));
  return {
    settings: new JsonSettingsRepository(path.join(state.dir, "settings.json")),
    portal: { credentialFingerprint: async () => null },
    files: {},
    ensureDemoData: async () => undefined,
  };
});

const { adminLogin, changeTeamPassword } = await import("@/app/admin/actions");
const { requireAdmin } = await import("@/server/auth");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

async function login(email: string, password: string): Promise<string | undefined> {
  state.jar.clear();
  const result = await adminLogin(null, form({ email, password })).catch((e: Error) => e.message);
  return result === "redirect:/admin" ? state.jar.get("weddinas_session") : undefined;
}

const canelaHash = hashTeamPassword("clave-inicial-canela");

describe("a team member changes their own password", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "test-secret");
    vi.stubEnv("ADMIN_USERS", `canela@weddinas.com=${canelaHash},paula@weddinas.com=${hashTeamPassword("clave-inicial-paula")}`);
    rmSync(path.join(state.dir, "settings.json"), { force: true });
  });
  afterAll(() => rmSync(state.dir, { recursive: true, force: true }));

  const signedIn = async (cookie: string | undefined) => {
    state.jar.clear();
    if (cookie) state.jar.set("weddinas_session", cookie);
    return requireAdmin().then(
      () => true,
      () => false,
    );
  };

  it("needs the current password, then logs in only with the new one and ends her other sessions", async () => {
    const other = await login("canela@weddinas.com", "clave-inicial-canela");
    const mine = await login("canela@weddinas.com", "clave-inicial-canela");
    expect(other && mine).toBeTruthy();

    expect(await changeTeamPassword(null, form({ current: "otra-clave-xx", next: "clave-nueva-canela", repeat: "clave-nueva-canela" }))).toEqual({
      error: "La clave actual no es correcta.",
    });
    expect(await changeTeamPassword(null, form({ current: "clave-inicial-canela", next: "corta", repeat: "corta" }))).toEqual({
      error: "La clave nueva tiene que tener al menos 10 caracteres.",
    });
    expect(await changeTeamPassword(null, form({ current: "clave-inicial-canela", next: "clave-nueva-canela", repeat: "clave-nueva-canela" }))).toEqual({ ok: true });
    const renewed = state.jar.get("weddinas_session");

    expect(await signedIn(renewed)).toBe(true);
    expect(await signedIn(other)).toBe(false);
    expect(await login("canela@weddinas.com", "clave-inicial-canela")).toBeUndefined();
    expect(await login("canela@weddinas.com", "clave-nueva-canela")).toBeTruthy();
    expect(await login("paula@weddinas.com", "clave-inicial-paula")).toBeTruthy();
  });

  it("a reset in ADMIN_USERS replaces the password she changed in the app", async () => {
    await login("canela@weddinas.com", "clave-inicial-canela");
    await changeTeamPassword(null, form({ current: "clave-inicial-canela", next: "clave-nueva-canela", repeat: "clave-nueva-canela" }));
    vi.stubEnv("ADMIN_USERS", `canela@weddinas.com=${hashTeamPassword("clave-reseteada-canela")}`);
    expect(await login("canela@weddinas.com", "clave-nueva-canela")).toBeUndefined();
    expect(await login("canela@weddinas.com", "clave-reseteada-canela")).toBeTruthy();
  });

  it("is not available without a signed-in member, nor with the shared code", async () => {
    state.jar.clear();
    await expect(changeTeamPassword(null, form({}))).rejects.toThrow("redirect:/admin/login");
    vi.stubEnv("ADMIN_USERS", "");
    vi.stubEnv("ADMIN_CODE", "codigo-compartido");
    state.jar.clear();
    await adminLogin(null, form({ code: "codigo-compartido" })).catch(() => undefined);
    expect(await changeTeamPassword(null, form({ current: "x", next: "clave-nueva-canela", repeat: "clave-nueva-canela" }))).toEqual({
      error: "Para cambiar la clave entrá con tu mail.",
    });
  });
});
