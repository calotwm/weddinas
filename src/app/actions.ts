"use server";

import { redirect } from "next/navigation";
import { endSession, startSession } from "@/server/auth";
import { ensureDemoData, portal } from "@/server/container";

export type LoginState = { error: string } | null;

export async function loginWithCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  await ensureDemoData();
  const code = String(formData.get("code") ?? "");
  const couple = code.trim() ? await portal.login(code) : null;
  if (!couple) return { error: "Ese código no es válido. Revisalo o escribinos y te ayudamos." };

  await startSession({ role: "couple", coupleId: couple.id });
  redirect("/portal");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/");
}
