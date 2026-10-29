"use server";

import { redirect } from "next/navigation";
import { allowLoginAttempt, endSession, startCoupleSession } from "@/server/auth";
import { ensureDemoData, portal } from "@/server/container";

export type LoginState = { error: string } | null;

export async function loginWithCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!(await allowLoginAttempt("couple"))) {
    return { error: "Demasiados intentos. Esperá unos minutos y volvé a probar." };
  }
  await ensureDemoData();
  const code = String(formData.get("code") ?? "").slice(0, 40);
  const couple = code.trim() ? await portal.login(code) : null;
  if (!couple) return { error: "Ese código no es válido. Revisalo o escribinos y te ayudamos." };

  await startCoupleSession(couple.id);
  redirect("/portal");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/");
}
