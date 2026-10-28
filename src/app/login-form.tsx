"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { loginWithCode } from "./actions";

export function LoginForm() {
  const [state, action] = useActionState(loginWithCode, null);

  return (
    <form action={action} className="space-y-4">
      <label htmlFor="code" className="label">Código de acceso</label>
      <input
        id="code"
        name="code"
        required
        autoComplete="one-time-code"
        autoCapitalize="characters"
        placeholder="XXXX-XXXX"
        className="field text-center font-display text-2xl tracking-[0.3em] uppercase"
      />
      {state?.error && <p role="alert" className="text-sm text-rust">{state.error}</p>}
      <SubmitButton className="btn-primary w-full py-3.5" pendingText="Entrando…">Entrar a nuestro portal</SubmitButton>
    </form>
  );
}
