"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { loginWithCode } from "./actions";

export function LoginForm() {
  const [state, action] = useActionState(loginWithCode, null);

  return (
    <form action={action} className="space-y-4">
      <label htmlFor="code" className="label text-center">Código de acceso</label>
      <input
        id="code"
        name="code"
        required
        maxLength={12}
        autoComplete="one-time-code"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="XXXX-XXXX"
        aria-invalid={Boolean(state?.error)}
        aria-describedby={state?.error ? "code-error" : undefined}
        className="field text-center font-display text-2xl tracking-[0.3em] uppercase"
      />
      {state?.error && (
        <p id="code-error" role="alert" className="rounded-xl bg-rust/10 px-3 py-2 text-center text-sm text-rust">
          {state.error}
        </p>
      )}
      <SubmitButton className="btn-primary w-full py-3.5" pendingText="Entrando…">Entrar a nuestro portal</SubmitButton>
    </form>
  );
}
